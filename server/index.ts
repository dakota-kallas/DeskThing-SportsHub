import {
  DeskThing as DK,
  SettingsNumber,
  SettingsString,
  SocketData,
} from 'deskthing-server';
const DeskThing = DK.getInstance();
export { DeskThing }; // Required export of this exact name for the server to connect
import SportsHubService from './sportsHub';

const start = async () => {
  const sportsHub = SportsHubService.getInstance();
  let Data = await DeskThing.getData();
  DeskThing.on('data', (newData) => {
    // Syncs the data with the server
    Data = newData;
    if (Data) {
      sportsHub.updateData(Data);
    }
  });

  // This is how to add settings (implementation may vary)
  if (!Data?.settings?.refreshInterval) {
    setupSettings();
  }

  const handleGet = async (request: SocketData) => {
    if (request.request === 'sportshub_data') {
      DeskThing.sendLog('Getting Sports Hub data');
      const sportsData = await sportsHub.getSportsHub();
      if (sportsData) {
        DeskThing.sendDataToClient({
          type: 'sportshub_data',
          payload: sportsData,
        });
      } else {
        console.warn('Error getting Sports Hub data');
      }
    }
  };

  DeskThing.on('get', handleGet);
  const stop = async () => {
    sportsHub.stop();
  };
  DeskThing.on('stop', stop);
};

const setupSettings = async () => {
  const refreshIntervalSetting = {
    label: 'Refresh Interval (minutes)',
    description: 'The amount of minutes between each refresh.',
    type: 'number',
    value: 5,
    max: 60,
    min: 1,
  } as SettingsNumber;

  DeskThing.addSettings({
    refreshInterval: refreshIntervalSetting,
  });
};

// Main Entrypoint of the server
DeskThing.on('start', start);
