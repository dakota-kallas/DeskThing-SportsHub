import { DeskThing } from './index';
import { DataInterface } from 'deskthing-server';
import { Game, SportsHubData, Team } from '../src/stores/sportsHubStore';

class SportsHubService {
  private sportsHubData: SportsHubData;
  private lastUpdateTime: Date | null;
  private updateTaskId: (() => void) | null = null;
  private deskthing: typeof DeskThing;
  private static instance: SportsHubService | null = null;
  private refreshInterval: number = 5;

  constructor() {
    this.deskthing = DeskThing;
    this.updateSportsHub();
    this.scheduleIntervalUpdates();
  }

  static getInstance(): SportsHubService {
    if (!SportsHubService.instance) {
      SportsHubService.instance = new SportsHubService();
    }
    return SportsHubService.instance;
  }

  private async updateSportsHub() {
    this.deskthing.sendLog(`Fetching Sports Hub data...`);
    this.sportsHubData.games = [];

    const url =
      'https://api-secure.sports.yahoo.com/v1/editorial/s/scoreboard?lang=en-US&region=US&ysp_redesign=1&ysp_platform=desktop&leagues=nba&date=2024-11-12&v=2&ysp_enable_last_update=1';
    const games = await this.fetchNBAData(url);
    this.sportsHubData.games = games;

    const now = new Date();
    const timeString = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true, // Use 12-hour format (AM/PM)
    });
    this.lastUpdateTime = now;
    this.sportsHubData.lastUpdated = timeString;

    this.deskthing.sendLog(`Sports Hub updated`);
    this.deskthing.sendDataToClient({
      type: 'sportshub_data',
      payload: this.sportsHubData,
    });
  }

  private scheduleIntervalUpdates() {
    if (this.updateTaskId) {
      this.updateTaskId();
    }
    this.updateTaskId = DeskThing.addBackgroundTaskLoop(async () => {
      this.updateSportsHub();
      const interval = this.refreshInterval > 0 ? this.refreshInterval : 1;
      await this.sleep(interval * 60 * 1000);
    }); // Update every set amount of minutes
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public updateData(data: DataInterface) {
    if (!data.settings) {
      this.deskthing.sendLog('No settings defined');
      return;
    }
    try {
      this.deskthing.sendLog('Updating settings');
      this.refreshInterval =
        (data.settings.refreshInterval.value as number) || 5;
      this.updateSportsHub();
    } catch (error) {
      this.deskthing.sendLog('Error updating Sports Hub data: ' + error);
    }
  }

  async stop() {
    this.lastUpdateTime = null;
  }

  public async getSportsHub(): Promise<SportsHubData> {
    // If it's been more than {set refresh interval} since the last update, update the sports data
    if (
      !this.lastUpdateTime ||
      new Date().getTime() - this.lastUpdateTime.getTime() > 15 * 60 * 1000
    ) {
      DeskThing.sendLog('Fetching Sports Hub data...');
      await this.updateSportsHub();
    }
    DeskThing.sendLog('Returning Sports Hub data');
    return this.sportsHubData;
  }

  // Function to fetch and parse data from the API
  private async fetchNBAData(url: string): Promise<Game[]> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
      }

      const data = await response.json();

      // Retrieve team records and logos
      const teamRecords: { [teamId: string]: string } =
        data.service.scoreboard.teamrecord;
      const teamLogos: { [teamId: string]: string } =
        data.service.scoreboard.teamLogo;

      // Parse NBA teams
      const teamsMap: { [id: string]: Team } = Object.fromEntries(
        Object.values(data.service.scoreboard.teams).map((team: any) => [
          team.team_id,
          {
            id: team.team_id,
            name: team.full_name,
            abbreviation: team.abbr,
            conference: team.conference,
            division: team.division,
            record: teamRecords[team.team_id] ?? 'N/A', // Use record from teamRecords
            logo: (teamLogos[team.team_id] ?? '').replace(/\\\//g, '/'), // Clean up logo URL
          },
        ])
      );

      // Parse NBA games
      const games: Game[] = Object.values(data.service.scoreboard.games).map(
        (game: any) => ({
          gameId: game.gameid,
          startTime: game.start_time,
          homeTeam: teamsMap[game.home_team_id],
          awayTeam: teamsMap[game.away_team_id],
          homeScore: game.total_home_points,
          awayScore: game.total_away_points,
          status: game.status_display_name,
          gameType: game.game_type,
          periods: game.game_periods.map((period: any) => ({
            periodId: period.period_id,
            name: period.display_name,
            awayPoints: period.away_points,
            homePoints: period.home_points,
          })),
        })
      );

      return games;
    } catch (error) {
      console.error('Error fetching or parsing data:', error);
      return []; // Return an empty array in case of error
    }
  }
}

export default SportsHubService;
