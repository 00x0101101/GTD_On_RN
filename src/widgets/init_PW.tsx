import { BuiltInPowerupCodes, PropertyType, ReactRNPlugin } from '@remnote/plugin-sdk';
import { GTD_PW_CODE } from './consts';


const egdtName = 'egtd';


export const init_PW = async (plugin: ReactRNPlugin) => {
    let egtd = undefined;

    //region Skip the Init procedure if the PW has already exist.
    try {
        if (!(egtd = await plugin.powerup.getPowerupByCode(egdtName))) return;
    } catch (e) {
        await plugin.app.toast('GTD Init ready.');
        return;
    }
    //endregion

    //region Init the TimeTick PW
    let tktyName = 'tkty';


    let tktyList = [
        [GTD_PW_CODE.TICK_TYPE.DEADLINE, 'Deadline'],
        [GTD_PW_CODE.TICK_TYPE.WARNING, 'Warning'],
        [GTD_PW_CODE.TICK_TYPE.INFO, 'Informing'],
        [GTD_PW_CODE.TICK_TYPE.LOG, 'LogTick'],
    ];

    await plugin.app.registerPowerup('Time Tick', 'ttk', 'The powerUp to tag the time ticks, mainly used in DailyDocs', {
        slots: [{
            code: tktyName,
            name: 'TickType',
            onlyProgrammaticModifying: true,
            hidden: false,
        }].concat(tktyList.map((item) => {
            return { code: item[0], name: item[1], onlyProgrammaticModifying: true, hidden: true };
        })),
    });

    let ttk = await plugin.powerup.getPowerupByCode('ttk');

    // all the slots be tagged with "#TickType"
    tktyList.map(async (pwItem) => {
        let pwSlot = await plugin.powerup.getPowerupSlotByCode(tktyName, pwItem[0]);
        if (pwSlot && ttk) {
            await pwSlot.addTag(ttk);
            await pwSlot.setIsProperty(false);
        }
    });
    //endregion

    //region Init the GTD PW
    let gtdSlots: any[][] = [
        [GTD_PW_CODE.DEADLINE, 'DDL', PropertyType.DATE],
        [GTD_PW_CODE.TIME_TICK, 'timeTick', PropertyType.MULTI_SELECT],
        [GTD_PW_CODE.SCENARIO, 'scenario', PropertyType.TEXT],
        [GTD_PW_CODE.INFORM_DATE, 'informDate', PropertyType.DATE],
        [GTD_PW_CODE.OWNER_PROJECT, 'ownerProject', PropertyType.SINGLE_SELECT],
        [GTD_PW_CODE.TREAT_AS, 'treatAs', PropertyType.SINGLE_SELECT],
        [GTD_PW_CODE.MESSAGE, 'Msg.', PropertyType.TEXT],
    ];


    await plugin.app.registerPowerup('GTD Engine', egdtName, 'powerUp fulfilling GTD workflow support', {
        slots: gtdSlots.map(slot => {
            return {
                code: slot[0],
                name: slot[1],
                hidden: false,
                onlyProgrammaticModifying: true,
                selectSourceType: slot[2],
            };
        }),
    });


    //Add the GTD into sidebar
    let sidebar = await plugin.powerup.getPowerupByCode(BuiltInPowerupCodes.DocumentSidebar);
    let portal = await plugin.rem.createPortal();
    portal && await egtd.addToPortal(portal);
    //endregion


};

