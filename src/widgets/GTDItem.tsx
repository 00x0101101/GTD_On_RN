import { PORTAL_TYPE, ReactRNPlugin, Rem, RichTextInterface, RNPlugin } from '@remnote/plugin-sdk';
import { GTD_LOGGER_PW_CODE } from './consts';
import { Utils } from './utils';
import _ from 'lodash';

export class GTDItem{
    private rem: Rem;
    private plugin: ReactRNPlugin;
    private utils: Utils;
    constructor(r:Rem,plugin:ReactRNPlugin,util:Utils) {
        this.rem=r;
        this.plugin=plugin;
        this.utils=util;
    }

    public async createPortalForItem(uniqUnder:undefined|Rem=undefined){

        if(uniqUnder)
        {
            for(const por of await this.rem.portalsAndDocumentsIn())
            {
                if(por._id!==this.rem._id&&por.parent===uniqUnder._id&&await por.getPortalType()===PORTAL_TYPE.PORTAL)
                    return por;
            }
        }

        const portal=await this.plugin.rem.createPortal();
        if(!portal)return;
        await this.rem.addToPortal(portal);
        if(uniqUnder)await portal.setParent(uniqUnder)
        return portal;
    }

    public async createReferenceUnder(refParent?:Rem){
        if(refParent)
        {
            for(const refR of await this.rem.remsReferencingThis())
            {
                if(refR.parent===refParent._id)
                    return refR
            }
        }

        const refContent=await this.plugin.richText.rem(this.rem).value()
        const ref=await this.utils.createRemWithText(refContent)
        if(refParent)await ref.setParent(refParent)
        return ref
    }



    /**
     * get the property specified by "propertyId" of the rem "r" and return it as Rem
     * @param r
     * @param propertyId
     * @return
     *
     * when the property to return does not contain a reference, the param "type" will be ignored and the plain text itself will be returned.
     *
     * when `type==="Rem"` and the property to return contains a reference, but the Rem cannot be found (e.g. Privacy Rem or Deleted Rem), the function will return this id despite the "type" parameter
     */
    public async getPropertyOfRemAsRems(propertyId:string) {
        let propertyRichText=await this.rem.getTagPropertyValue(propertyId)
        let results:string[];
        results=_.uniq<string>(await this.plugin.richText.getRemIdsFromRichText(propertyRichText))
        const resultRems=await this.plugin.rem.findMany(results)
        if(resultRems?.length)
            return resultRems
    }






}