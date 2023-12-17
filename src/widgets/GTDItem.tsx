import { PORTAL_TYPE, ReactRNPlugin, Rem, RichTextInterface, RNPlugin } from '@remnote/plugin-sdk';
import { GTD_LOGGER_PW_CODE } from './consts';
import { Utils } from './utils';

export class GTDItem{
    private rem: Rem;
    private plugin: ReactRNPlugin;
    private utils: Utils;
    constructor(r:Rem,plugin:ReactRNPlugin,util:Utils) {
        this.rem=r;
        this.plugin=plugin;
        this.utils=util;
    }

    public async createPortalForItem(r:Rem,uniqUnder:undefined|Rem=undefined){

        if(uniqUnder)
        {
            for(const por of await r.portalsAndDocumentsIn())
            {
                if(por._id!==r._id&&por.parent===uniqUnder._id&&await por.getPortalType()===PORTAL_TYPE.PORTAL)
                    return por;
            }
        }

        const portal=await this.plugin.rem.createPortal();
        if(!portal)return;
        await r.addToPortal(portal);
        if(uniqUnder)await portal.setParent(uniqUnder)
        return portal;
    }

    public async createReferenceUnder(r:Rem,refParent?:Rem){
        if(refParent)
        {
            for(const refR of await r.remsReferencingThis())
            {
                if(refR.parent===refParent._id)
                    return refR
            }
        }

        const refContent=await this.plugin.richText.rem(r).value()
        const ref=await this.utils.createRemWithText(refContent)
        if(refParent)await ref.setParent(refParent)
        return ref
    }




}