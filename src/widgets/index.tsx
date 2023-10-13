import { declareIndexPlugin, PluginCommandMenuLocation, ReactRNPlugin, RemId } from '@remnote/plugin-sdk';
import '../style.css';
// import '../App.css';
import { GTD_PW_CODE } from './consts';
import { init_PW } from './init_PW';

async function onActivate(plugin: ReactRNPlugin) {

    //init all the PWs
    await init_PW(plugin);



    // add slash command to add "GTD Engine" Tag

    // await plugin.app.registerRemMenuItem({
    //     name:""
    // })


    // the PowerUp "Edit Later" will be the In-tray of this GTD workflow
    //



}

async function onDeactivate(_: ReactRNPlugin) {
}

declareIndexPlugin(onActivate, onDeactivate);
