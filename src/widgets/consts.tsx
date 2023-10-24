const GTD_LOGGER_CODE={
  TIME_TICK:"ttk",
  THE_DATE: "gdat",
  SCENARIO:"scn",
  TIMELINE_TYPE:"gttk",
  OWNER_PROJECT:"goprj",
  TREAT_AS:"gact",
  MESSAGE:"gmsg"
}
export const GTD_LOGGER_PW_CODE={
  LOGGER_PW:"engine_gtd",
  LOGGER_SLOTS:GTD_LOGGER_CODE
}

const actOptions={
  Later:"_wait",
  Delegate:"_await",
  Project:"_prj",
  SomeDay:"_wish",
  Reference:"_ref",
  WasteBin:"_bin",
  Now:"_now"
}
const actContainerSlots={
  Later:"c_wait",
  Delegate:"c_await",
  Project:"c_prj",
  SomeDay:"c_wish",
  Reference:"c_ref",
  WasteBin:"c_bin",
  Now:"c_now"
}
export const ACT_OPTIONS_LOGGER_PW_CODE={
  ACT_PW:"gacto",
  CONTAINER_PW:"gactc",
  CONTAINER_INTERFACE:"gactc_i",
  ACT_SLOTS:actOptions,
  CONTAIN_SLOTS:actContainerSlots
}

const tickType={
  DEADLINE:"Deadline",
  WARNING:"Warning",
  INFO:"Informing",
  LOG:"LogTick"
}
export const TIME_TK_PW_CODE =  {
  TICK_PW:"time_tick",
  TICK_SLOT:"tkty",
  TICK_TYPE:tickType
}
export const TTK_LOGGER_PW_CODE={
  LOGGER_PW: "gtd_ttk_engine",
  LOGGER_SLOTS:tickType
}

export class eventCombo{
  slotSrc:string|undefined;
  slotRef:string|undefined;
  host:string|undefined
}
export enum HostCheckResult {
  PW_NOT_EXIST=-1,
  HOST_NOT_UNIQUE=3,
  HOST_NOT_EXIST=2,
  HOST_UNIQUE=1
}
export enum HostType{
  SLOT = 1,
  OPTIONS = 2,
  CONTAINER = 3

}
export const GTD_HOST_PW="host_gtd"

export const PW2SLOTS=new Map<string,Object>([
    [GTD_LOGGER_PW_CODE.LOGGER_PW,GTD_LOGGER_PW_CODE.LOGGER_SLOTS],
    [ACT_OPTIONS_LOGGER_PW_CODE.ACT_PW,ACT_OPTIONS_LOGGER_PW_CODE.ACT_SLOTS],
    [ACT_OPTIONS_LOGGER_PW_CODE.CONTAINER_PW,ACT_OPTIONS_LOGGER_PW_CODE.CONTAIN_SLOTS]
])