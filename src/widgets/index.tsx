import { declareIndexPlugin, PluginCommandMenuLocation, ReactRNPlugin, RemId } from '@remnote/plugin-sdk';
import '../style.css';
import '../App.css';
import { GTD_PW_CODE } from './consts';

async function onActivate(plugin: ReactRNPlugin) {

    //init all the PWs

    //add the commands
    await plugin.app.registerMenuItem({
        id: "cgtd",
        name: 'name',
        location: PluginCommandMenuLocation.PropertyConfigMenu,
        action: async (args: { rowIds: RemId[]; columnPropertyId: RemId }) => {
            let actRem = await plugin.powerup.getPowerupSlotByCode(GTD_PW_CODE.GTD_ENGINE, GTD_PW_CODE.TREAT_AS);

            // is the Column "Treat As"
            if (args.columnPropertyId === actRem?._id) {
                const allRows = (await plugin.rem.findMany(args.rowIds)) || [];
                for(let rem in allRows)
                {

                }
            }
        },
    });

    // Register a sidebar widget.
    // await plugin.app.registerWidget('sample_widget', WidgetLocation.RightSidebar, {
    //     dimensions: { height: 'auto', width: '100%' },
    // });


}

async function onDeactivate(_: ReactRNPlugin) {
}

declareIndexPlugin(onActivate, onDeactivate);
