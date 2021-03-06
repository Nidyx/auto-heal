const Command = require('command');

module.exports = function AutoHeal(dispatch) {
    const command = Command(dispatch);
    
    const Skills = {
        6: [ // Priest
            19, // Focus Heal
            37  // Immersion
        ],
        7: [ // Mystic
            5, // Titanic Favor
            9  // Arun's Cleansing Touch
        ]
    };
    
    const MaxDistance = 35; // in-game meters. can work up to 35m
    const MaxVertical = 28; // (Ignore targets at top of CS ladders, etc). Can also be 35m
    
    let autoHeal = true,
        autoCleanse = true,
        hpCutoff = 97,   // (healing only) ignore members that have more HP% than this
        enabled = false, // gets enabled if you log in as a healer
        playerId = 0,
        gameId = 0,
        playerLocation = {},
        partyMembers = [],
        job = -1,
        glyphs = null;
        
    command.add('autoheal', (p1)=> {
        if (p1 == null) {
            autoHeal = !autoHeal;
        } else if (p1.toLowerCase() === 'off') {
            autoHeal = false;
        } else if (p1.toLowerCase() === 'on') {
            autoHeal = true;
        } else if (!isNaN(p1)) {
            autoHeal = true;
            hpCutoff = (p1 < 0 ? 0 : p1 > 100 ? 100 : p1);
        } else {
            command.message('(auto-heal) ' + p1 +' is an invalid argument');
            return;
        }        
        command.message('(auto-heal) Healing ' + (autoHeal ? 'enabled (' + hpCutoff + '%)' : 'disabled'));
    });
    
    command.add('autocleanse', (p1) => {
        if (p1 == null) {
            autoCleanse = !autoCleanse;
        } else if (p1.toLowerCase() === 'off') {
            autoCleanse = false;
        } else if (p1.toLowerCase() === 'on') {
            autoCleanse = true;
        } else {
            command.message('(auto-heal) ' + p1 +' is an invalid argument for cleanse command');
            return;
        }
        command.message('(auto-heal) Cleansing ' + (autoCleanse ? 'enabled' : 'disabled'));
    });
    
    dispatch.hook('S_LOGIN', 10, (event) => {
        playerId = event.playerId;
        gameId = event.gameId;
        job = (event.templateId - 10101) % 100;
        enabled = (Skills[job]) ? true : false;
    })
    
    dispatch.hook('S_PARTY_MEMBER_LIST', 6, (event) => {
        if (!enabled) return;
        // refresh locations of existing party members.
        for (let i = 0; i < event.members.length; i++) {
            for (let j = 0; j < partyMembers.length; j++) {
                if (partyMembers[j]) {
                    if (event.members[i].gameId.equals(partyMembers[j].gameId)) {
                        event.members[i].loc = partyMembers[j].loc;
                        event.members[i].hpP = partyMembers[j].hpP;
                    }
                }
            }
        }
        partyMembers = event.members;
        // remove self from targets
        for (let i = 0; i < partyMembers.length; i++) {
            if (partyMembers[i].gameId.equals(gameId)) {
                partyMembers.splice(i, 1);
                return;
            }
        }
    })
    
    dispatch.hook('S_LEAVE_PARTY', 1, (event) => {
        partyMembers = [];
    })
    
    dispatch.hook('C_PLAYER_LOCATION', 3, (event) => {
        if (!enabled) return;
        playerLocation = event;
    })
    
    dispatch.hook('S_SPAWN_ME', 2, (event) => {
        playerLocation.gameId = event.gameId;
        playerLocation.loc = event.loc;
        playerLocation.w = event.w;
    })
    
    dispatch.hook('S_SPAWN_USER', 13, (event) => {
        if (!enabled) return;
        if (partyMembers.length != 0) {
            for (let i = 0; i < partyMembers.length; i++) {
                if (partyMembers[i].gameId.equals(event.gameId)) {
                    partyMembers[i].loc = event.loc;
                    partyMembers[i].hpP = (event.alive ? 100 : 0);
                    return;
                }
            }
        }
    })
    
    dispatch.hook('S_USER_LOCATION', 3, (event) => {
        if (!enabled) return;
        for (let i = 0; i < partyMembers.length; i++) {
            if (partyMembers[i].gameId.equals(event.gameId)) {
                partyMembers[i].loc = event.loc;
                return;
            }
        }
    })
    
    dispatch.hook('S_USER_LOCATION_IN_ACTION', 2, (event) => {
        if (!enabled) return;
        for (let i = 0; i < partyMembers.length; i++) {
            if (partyMembers[i].gameId.equals(event.gameId)) {
                partyMembers[i].loc = event.loc;
                return;
            }
        }
    })
    
    dispatch.hook('S_INSTANT_DASH', 3, (event) => {
        if (!enabled) return;
        for (let i = 0; i < partyMembers.length; i++) {
            if (partyMembers[i].gameId.equals(event.gameId)) {
                partyMembers[i].loc = event.loc;
                return;
            }
        }
    })
    
    dispatch.hook('S_PARTY_MEMBER_CHANGE_HP', 3, (event) => {
        if (!enabled) return;
        if (playerId == event.playerId) return;
        for (let i = 0; i < partyMembers.length; i++) {
            if (partyMembers[i].playerId === event.playerId) {
                partyMembers[i].hpP = (event.currentHp / event.maxHp) * 100;
                return;
            }
        }
    })
    
    dispatch.hook('S_PARTY_MEMBER_STAT_UPDATE', 3, (event) => {
        if (!enabled) return;
        if (playerId == event.playerId) return;
        for (let i = 0; i < partyMembers.length; i++) {
            if (partyMembers[i].playerId === event.playerId) {
                partyMembers[i].hpP = (event.curHp / event.maxHp) * 100;
                return;
            }
        }
    })
    
    dispatch.hook('S_DEAD_LOCATION', 2, (event) => {
        if (!enabled) return;
        for (let i = 0; i < partyMembers.length; i++) {
            if (partyMembers[i].gameId.equals(event.gameId)) {
                partyMembers[i].loc = event.loc;
                partyMembers[i].hpP = 0;
                return;
            }
        }
    })
    
    dispatch.hook('S_LEAVE_PARTY_MEMBER', 2, (event) => {
        if (!enabled) return;
        for (let i = 0; i < partyMembers.length; i++) {
            if (partyMembers[i].playerId === event.playerId) {
                partyMembers.splice(i, 1);
                return;
            }
        }
    });
     
    dispatch.hook('S_LOGOUT_PARTY_MEMBER', 1, (event) => {
        if (!enabled) return;
        for (let i = 0; i < partyMembers.length; i++) {
            if (partyMembers[i].playerId === event.playerId) {
                partyMembers[i].online = false;
                return;
            }
        }
    });
    
    dispatch.hook('S_BAN_PARTY_MEMBER', 1, (event) => {
        if (!enabled) return;
        for (let i = 0; i < partyMembers.length; i++) {
            if (partyMembers[i].playerId === event.playerId) {
                partyMembers.splice(i, 1);
                return;
            }
        }
    });
    
    dispatch.hook('C_START_SKILL', 5, (event) => {
        if (!enabled) return;
        if (partyMembers.length == 0) return; // be in a party
        if ((event.skill - 0x4000000) / 10 & 1 != 0) { // is casting (opposed to locking on)
            playerLocation.w = event.w;
            return; 
        }
        let skill = Math.floor((event.skill - 0x4000000) / 10000);
        
        if(Skills[job] && Skills[job].includes(skill)) {
            if(skill != 9 && !autoHeal) return; // skip heal if disabled
            if(skill == 9 && !autoCleanse) return; // skip cleanse if disabled
            if(skill == 9 && partyMembers.length > 4) return; // skip cleanse if in a raid
            
            let targetMembers = [];
            let maxTargetCount = getMaxTargets(skill);
            if (skill != 9) sortHp();
            for (let i = 0; i < partyMembers.length; i++) {
                if (partyMembers[i].online &&
                    partyMembers[i].hpP != undefined &&
                    partyMembers[i].hpP != 0 &&
                    ((skill == 9) ? true : partyMembers[i].hpP <= hpCutoff) && // (cleanse) ignore max hp
                    partyMembers[i].loc != undefined &&
                    (partyMembers[i].loc.dist3D(playerLocation.loc) / 25) <= MaxDistance && 
                    (Math.abs(partyMembers[i].loc.z - playerLocation.loc.z) / 25) <= MaxVertical)
                    {
                        targetMembers.push(partyMembers[i]);
                        if (targetMembers.length == maxTargetCount) break;
                    }
            }
            
            if (targetMembers.length > 0) {
                for (let i = 0; i < targetMembers.length; i++) {
                    setTimeout(() => {
                        dispatch.toServer('C_CAN_LOCKON_TARGET', 1, {target: targetMembers[i].gameId, skill: event.skill});
                    }, 5);
                }
                
                setTimeout(() => {
                    dispatch.toServer('C_START_SKILL', 5, Object.assign({}, event, {w: playerLocation.w, skill: (event.skill + 10)}));
                }, 10);
            }
        }
        
    })
    
    dispatch.hook('S_CREST_INFO', 2, (event) => {
        if (!enabled) return;
        glyphs = event.crests;
    })
    
    dispatch.hook('S_CREST_APPLY', 2, (event) => {
        if (!enabled) return;
        for (let i = 0; i < glyphs.length; i++) {
            if (glyphs[i].id == event.id) {
                glyphs[i].enable = event.enable;
                return;
            }
        }
    })
    
    function getMaxTargets (skill) {
        switch(skill) {
            case 19: return isGlyphEnabled(28003) ? 4 : 2;
            case 37: return 1;
            case 5: return isGlyphEnabled(27000) ? 4 : 2;
            case 9: return (isGlyphEnabled(27063) || isGlyphEnabled(27003)) ? 5 : 3;
        }
        return 1;
    }
    
    function isGlyphEnabled(glyphId) {
        for(let i = 0; i < glyphs.length; i++) {
            if (glyphs[i].id == glyphId && glyphs[i].enable) {
                return true;
            }
        }
        return false;
    }
    
    function sortHp() {
        partyMembers.sort(function (a, b) {
            return parseFloat(a.hpP) - parseFloat(b.hpP);
        });
    }
    
}