import { AppEvents, declareIndexPlugin, PluginCommandMenuLocation, ReactRNPlugin, RemId } from '@remnote/plugin-sdk';
import '../style.css';
import { init_PowerUps } from './init_PowerUps';
// import '../App.css';


async function onActivate(plugin: ReactRNPlugin) {

    // init all the PWs
    let r=await init_PowerUps(plugin);
    if(!r){
        await plugin.app.toast("Init Failed- GTD...")
        return
    }
    const gtdHost=r[0]
    const gtdTable=r[1]



    // Test Block
    // await plugin.event.addListener(AppEvents.RemChanged,"RFOHXniJ4C0dE8QOu",()=>{
    //     console.warn("remChanged...")
    // })
    //console.warn((await plugin.rem.findOne("BkKMBXZW9nXuAg0Uk"))?.taggedRem())

    // let igtd=await plugin.powerup.getPowerupByCode(itemGtdName);


    // // add slash command to add "GTD Engine" Tag
    // await plugin.app.registerCommand({
    //     id:"in-tray",
    //     name:"InTray",
    //     icon:`${plugin.rootURL}assets/alarm_clock.svg`,
    //     description:"Capture items into GTD workflow.",
    //     action:async ()=>{
    //         let presentRem=(await plugin.focus.getFocusedRem())
    //         igtd && presentRem?.addTag(igtd);
    //     }
    // },)



}

async function onDeactivate(_: ReactRNPlugin) {
}

declareIndexPlugin(onActivate, onDeactivate);
