import { AppEvents, declareIndexPlugin, PluginCommandMenuLocation, ReactRNPlugin, RemId } from '@remnote/plugin-sdk';
import '../style.css';
// import '../App.css';
import { GTD_PW_CODE, itemGtdName } from './consts';
import { init_PW } from './init_PW';

async function onActivate(plugin: ReactRNPlugin) {

    //init all the PWs
    await init_PW(plugin);

    await plugin.event.addListener(AppEvents.RemChanged,"RFOHXniJ4C0dE8QOu",()=>{
        console.warn("remChanged...")
    })


    let igtd=await plugin.powerup.getPowerupByCode(itemGtdName);


    // add slash command to add "GTD Engine" Tag
    await plugin.app.registerCommand({
        id:"in-tray",
        name:"InTray",
        icon:`${plugin.rootURL}assets/alarm_clock.svg`,
        description:"Capture items into GTD workflow.",
        action:async ()=>{
            let presentRem=(await plugin.focus.getFocusedRem())
            igtd && presentRem?.addTag(igtd);
        }
    },)

    // await plugin.app.registerRemMenuItem({
    //     name:""
    // })


    // the PowerUp "Edit Later" will be the In-tray of this GTD workflow
    //



}

async function onDeactivate(_: ReactRNPlugin) {
}

declareIndexPlugin(onActivate, onDeactivate);
