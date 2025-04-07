import { AppEvents, PropertyLocation, ReactRNPlugin, RNPlugin } from '@remnote/plugin-sdk';
import { ACT_OPTIONS_LOGGER_PW_CODE, GTD_ACTIVE_PW, GTD_HOST_PW, TIME_TK_PW_CODE, TRYS_PW_CODE } from './consts';
import { Utils } from './utils';

export const InitTrails=async (plugin:ReactRNPlugin,utils:Utils)=>{
    await plugin.app.registerPowerup('ToTry', TRYS_PW_CODE.TO_TRY, 'The powerUp to tag the "To Try" property of a project', {
        slots: []
    });
    await plugin.app.registerPowerup('ToTry', TRYS_PW_CODE.TRAIL, 'The powerUp to tag the "Tries" property of a project', {
        slots: []
    });

    await plugin.app.registerCommand({
        id:"as_2try_list",
        name:"as 'To Try' list",
        quickCode: "as2tries",
        action: async ()=>{
            const focus = await plugin.focus.getFocusedRem()
            if(!focus)return
            await focus.addPowerup(TRYS_PW_CODE.TO_TRY)
            await plugin.app.toast("NOTE: This powerUp tag can be removed manually.")
        }
    })

    await plugin.app.registerCommand({
        id:"as_tries_list",
        name:"as 'Tries' list",
        quickCode: "astrails",
        action: async ()=>{
            const focus = await plugin.focus.getFocusedRem()
            if(!focus)return
            await focus.addPowerup(TRYS_PW_CODE.TRAIL)
            await plugin.app.toast("NOTE: This powerUp tag can be removed manually.")
        }
    })

    const toTryPW=await plugin.powerup.getPowerupByCode(TRYS_PW_CODE.TO_TRY);
    const TriesPW = await plugin.powerup.getPowerupByCode(TRYS_PW_CODE.TRAIL);
    const prjPWSlot = await plugin.powerup.getPowerupSlotByCode(ACT_OPTIONS_LOGGER_PW_CODE.ACT_PW,ACT_OPTIONS_LOGGER_PW_CODE.ACT_SLOTS.Project)


    const gtd_host_pw=await plugin.powerup.getPowerupByCode(GTD_HOST_PW)
    if(!gtd_host_pw)return
    const gtdHost=await utils.getHostRemOf(gtd_host_pw);


    if(!prjPWSlot){
        await plugin.app.toast("NOT FOUND: Project Host")
        return
    }
    const prjHost = await utils.getHostRemOf(prjPWSlot)

    if(toTryPW){
        const toTryListArr = await toTryPW.taggedRem()
        for(const toTryList of toTryListArr){
            const handle = async ()=> {
                if(!await utils.hasTag(toTryList,toTryPW._id)){
                    plugin.event.removeListener(AppEvents.RemChanged,toTryList._id,handle)
                    for(const ch of await toTryList.getChildrenRem()){
                        await ch.removeTag(gtdHost._id)
                        await ch.removePowerup(GTD_ACTIVE_PW.PW)
                    }

                    return
                }
                const maybeprj = await toTryList.getParentRem()
                if(!maybeprj||!await utils.hasTag(maybeprj,prjHost._id)){
                    plugin.event.removeListener(AppEvents.RemChanged,toTryList._id,handle)
                    await plugin.app.toast("To-Try list unregistered for no project serving for...")
                    return
                }
                // if prj is tagged with 'project'...
                for(const ch of await toTryList.getChildrenRem()){
                    await ch.addTag(gtdHost)
                    await ch.addPowerup(GTD_ACTIVE_PW.PW)
                }

            }
            plugin.event.addListener(AppEvents.RemChanged,toTryList._id,handle)
        }
    }
    // get all the tagged "To-Try list" and set event listener for them
    toTryPW && plugin.event.addListener(AppEvents.RemChanged, toTryPW?._id, async () => {

    })

}