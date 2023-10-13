
const TICK_TYPE_PW_CODE={
  DEADLINE:"tddl",
  WARNING:"twrn",
  INFO:"tinfo",
  LOG:"tlog"
}

export  const itemGtdName = 'item_gtd';

export const GTD_PW_CODE={
  TIME_TICK:"ttk",
  GTD_ENGINE:"egtd",
  TICK_TYPE:TICK_TYPE_PW_CODE,
  DEADLINE: "gddl",
  SCENARIO:"scn",
  INFORM_DATE:"gind",
  OWNER_PROJECT:"goprj",
  TREAT_AS:"gact",
  MESSAGE:"gmsg"
}

export declare class eventCombo{
  slotSrc:string|undefined;
  slotRef:string|undefined;
  host:string|undefined
}
