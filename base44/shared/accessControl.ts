const adminCommands=new Set([
  'GET_OPERATIONS','GET_ADMIN_USERS','INVITE_USER','UPDATE_USER_ROLE',
  'CREATE_CHARACTER_BACKUP','RESTORE_CHARACTER_BACKUP','ROLLBACK_MIGRATION','RETRY_DEAD_LETTER',
  'CREATE_GAME',
   'GET_SIMULATION','CREATE_TEST_CHARACTER','SIM_MOVE_CHARACTER','SIM_GIVE_ITEM','SIM_APPLY_STATUS','SIM_SET_QUEST_STATE','SIM_START_ENCOUNTER','SIM_REPLAY_COMBAT','SIM_REPLAY_SUITE'
]);
export function isAdminCommand(command:string){return adminCommands.has(command);}
export function canExecuteCommand(user:any,command:string){return !isAdminCommand(command)||user?.role==='admin';}