import {
  blockDevice,
  getDevices,
  pauseDevice,
  renameDevice,
} from '../../api';

export const devicesClient = {
  list: getDevices,
  pause: pauseDevice,
  block: blockDevice,
  rename: renameDevice,
};
