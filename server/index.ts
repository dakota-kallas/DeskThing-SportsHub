import {
  DeskThing as DK,
  SettingsMultiSelect,
  SettingsNumber,
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

  const favoriteNBATeamsSetting = {
    label: 'Favorite NBA Teams',
    value: [],
    type: 'multiselect',
    options: [
      { label: 'Atlanta Hawks', value: 'ATL' },
      { label: 'Brooklyn Nets', value: 'BKN' },
      { label: 'Boston Celtics', value: 'BOS' },
      { label: 'Charlotte Hornets', value: 'CHA' },
      { label: 'Chicago Bulls', value: 'CHI' },
      { label: 'Cleveland Cavaliers', value: 'CLE' },
      { label: 'Dallas Mavericks', value: 'DAL' },
      { label: 'Denver Nuggets', value: 'DEN' },
      { label: 'Detroit Pistons', value: 'DET' },
      { label: 'Golden State Warriors', value: 'GSW' },
      { label: 'Houston Rockets', value: 'HOU' },
      { label: 'Indiana Pacers', value: 'IND' },
      { label: 'Los Angeles Clippers', value: 'LAC' },
      { label: 'Los Angeles Lakers', value: 'LAL' },
      { label: 'Memphis Grizzlies', value: 'MEM' },
      { label: 'Miami Heat', value: 'MIA' },
      { label: 'Milwaukee Bucks', value: 'MIL' },
      { label: 'Minnesota Timberwolves', value: 'MIN' },
      { label: 'New Orleans Pelicans', value: 'NOH' },
      { label: 'New York Knicks', value: 'NYK' },
      { label: 'Oklahoma City Thunder', value: 'OKC' },
      { label: 'Orlando Magic', value: 'ORL' },
      { label: 'Philadelphia 76ers', value: 'PHI' },
      { label: 'Phoenix Suns', value: 'PHO' },
      { label: 'Portland Trail Blazers', value: 'POR' },
      { label: 'Sacramento Kings', value: 'SAC' },
      { label: 'Toronto Raptors', value: 'TOR' },
      { label: 'Utah Jazz', value: 'UTH' },
      { label: 'Washington Wizards', value: 'WAS' },
    ],
  } as SettingsMultiSelect;

  DeskThing.addSettings({
    refreshInterval: refreshIntervalSetting,
    favoriteNBATeams: favoriteNBATeamsSetting,
  });
};

// Main Entrypoint of the server
DeskThing.on('start', start);
