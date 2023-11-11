import { declareIndexPlugin, ReactRNPlugin } from '@remnote/plugin-sdk';
import '../style.css';
import { init_PowerUps } from './init_PowerUps';


async function onActivate(plugin: ReactRNPlugin) {

    // init all the PWs

    let r=await init_PowerUps(plugin);
    if(!r){
        await plugin.app.toast("Init Failed- GTD...")
        return
    }



    // Test Block
    // let r=await plugin.rem.findOne("2ZfIFmjNhWbcIIBdm")
    // if(r)
    // {
    //     await plugin.app.toast(String((await r.getPortalType())+"???" ))
    // }

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
