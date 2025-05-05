import { DeskThing } from './index';
import { DataInterface } from 'deskthing-server';
import {
  Game,
  GameStatusType,
  SportsHubData,
  Team,
} from '../src/stores/sportsHubStore';

// Types and Constants
type League =
  | 'NFL'
  | 'NBA'
  | 'MLB'
  | 'MLS'
  | 'NCAAF'
  | 'NHL'
  | 'SerieA'
  | 'LaLiga'
  | 'PremierLeague'
  | 'ChampionsLeague';

const LEAGUE_CONFIGS = {
  MLB: {
    url: (date: string) =>
      `https://api-secure.sports.yahoo.com/v1/editorial/s/scoreboard?lang=en-US&region=US&leagues=mlb&date=${date}&v=2`,
  },
  MLS: {
    url: (date: string) =>
      `https://api-secure.sports.yahoo.com/v1/editorial/s/scoreboard?lang=en-US&region=US&leagues=soccer&date=${date}&v=2`,
    subleague: 'soccer.l.mls',
  },
  SerieA: {
    url: (date: string) =>
      `https://api-secure.sports.yahoo.com/v1/editorial/s/scoreboard?lang=en-US&region=US&leagues=soccer&date=${date}&v=2`,
    subleague: 'soccer.l.fbit',
  },
  LaLiga: {
    url: (date: string) =>
      `https://api-secure.sports.yahoo.com/v1/editorial/s/scoreboard?lang=en-US&region=US&leagues=soccer&date=${date}&v=2`,
    subleague: 'soccer.l.fbes',
  },
  ChampionsLeague: {
    url: (date: string) =>
      `https://api-secure.sports.yahoo.com/v1/editorial/s/scoreboard?lang=en-US&region=US&leagues=soccer&date=${date}&v=2`,
    subleague: 'soccer.l.fbchampions',
  },
  PremierLeague: {
    url: (date: string) =>
      `https://api-secure.sports.yahoo.com/v1/editorial/s/scoreboard?lang=en-US&region=US&leagues=soccer&date=${date}&v=2`,
    subleague: 'soccer.l.fbgb',
  },
  NHL: {
    url: (date: string) =>
      `https://api-secure.sports.yahoo.com/v1/editorial/s/scoreboard?lang=en-US&region=US&leagues=nhl&date=${date}&v=2`,
  },
  NBA: {
    url: (date: string) =>
      `https://api-secure.sports.yahoo.com/v1/editorial/s/scoreboard?lang=en-US&region=US&leagues=nba&date=${date}&v=2`,
  },
  NFL: {
    url: (date: string) =>
      `https://api-secure.sports.yahoo.com/v1/editorial/s/scoreboard?lang=en-US&region=US&leagues=nfl&season=current&sched_states=2&v=2&date=${date}`,
  },
  NCAAF: {
    url: (date: string) =>
      `https://api-secure.sports.yahoo.com/v1/editorial/s/scoreboard?lang=en-US&region=US&leagues=ncaaf&date=${date}&v=2`,
  },
};

const STATUS_ORDER = {
  pregame: 2,
  in_progress: 1,
  final: 3,
  postponed: 4,
} as const;

interface ServiceState {
  refreshInterval: number;
  leaguesToShow: string[];
  favoriteLeague: string;
  favoriteTeams: Record<League, string[]>;
}

class SportsHubService {
  private static instance: SportsHubService | null = null;
  private sportsHubData: SportsHubData = {} as SportsHubData;
  private lastUpdateTime: Date | null = null;
  private updateTaskId: (() => void) | null = null;
  private state: ServiceState = {
    refreshInterval: 1,
    leaguesToShow: [],
    favoriteLeague: 'NONE',
    favoriteTeams: {
      NFL: [],
      NBA: [],
      NHL: [],
      MLB: [],
      MLS: [],
      SerieA: [],
      LaLiga: [],
      ChampionsLeague: [],
      PremierLeague: [],
      NCAAF: [],
    },
  };

  private constructor() {
    this.initialize();
  }

  static getInstance(): SportsHubService {
    if (!SportsHubService.instance) {
      SportsHubService.instance = new SportsHubService();
    }
    return SportsHubService.instance;
  }

  private async initialize() {
    await this.updateSportsHub();
    this.scheduleIntervalUpdates();
  }

  private async updateSportsHub() {
    DeskThing.sendLog('Fetching Sports Hub data...');
    const now = new Date();
    const localDate = this.getFormattedDate(now);

    // Reset allGames array before updating
    this.sportsHubData.allGames = [];

    await this.updateLeagueData(now, localDate);
    this.consolidateAndSortGames();
    this.updateLastUpdateTime(now);

    DeskThing.sendLog(`Sports Hub updated`);
    DeskThing.sendDataToClient({
      type: 'sportshub_data',
      payload: this.sportsHubData,
    });
  }

  private getFormattedDate(date: Date): string {
    const localYear = date.getFullYear();
    const localMonth = String(date.getMonth() + 1).padStart(2, '0');
    const localDay = String(date.getDate()).padStart(2, '0');
    const localDate = `${localYear}-${localMonth}-${localDay}`;
    return localDate;
  }

  private async updateLeagueData(now: Date, localDate: string) {
    const leagueUpdates = this.state.leaguesToShow.map(async (league) => {
      if (this.shouldUpdateLeague(league as League, now)) {
        DeskThing.sendLog(`Updating ${league} data...`);
        const games = await this.fetchLeagueGames(league as League, localDate);
        this.sportsHubData[`${league.toLowerCase()}Games`] = games;
      }
    });

    await Promise.all(leagueUpdates);
  }

  private shouldUpdateLeague(league: League, now: Date): boolean {
    const currentGames = this.sportsHubData[
      `${league.toLowerCase()}Games`
    ] as Game[];
    return (
      !currentGames ||
      !this.lastUpdateTime ||
      this.lastUpdateTime.getDate() !== now.getDate() ||
      this.hasLiveGame(currentGames)
    );
  }

  private async fetchLeagueGames(
    league: League,
    date: string
  ): Promise<Game[]> {
    try {
      const config = LEAGUE_CONFIGS[league];
      const response = await fetch(config.url(date));
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      return await this.parseGameData(data, league);
    } catch (error) {
      DeskThing.sendError(`Error fetching ${league} data: ${error.message}`);
      return (
        (this.sportsHubData[`${league.toLowerCase()}Games`] as Game[]) || []
      );
    }
  }

  private async parseGameData(data: any, league: League): Promise<Game[]> {
    const { teams, teamrecord, teamLogo, games } = data.service.scoreboard;
    if (!teams || !teamrecord || !teamLogo || !games) {
      throw new Error('Invalid API response structure');
    }

    const teamsMap = await this.createTeamsMap(teams, teamrecord, teamLogo);
    return this.createGames(games, teamsMap, league);
  }

  private async createTeamsMap(
    teams: any,
    records: any,
    logos: any
  ): Promise<Record<string, Team>> {
    const teamsEntries = await Promise.all(
      Object.values(teams).map(async (team: any) => {
        const logo = await DeskThing.encodeImageFromUrl(
          (logos[team.team_id] || '').replace(/\\\//g, '/')
        );

        return [
          team.team_id,
          {
            id: team.team_id,
            firstName: team.first_name,
            lastName: team.last_name,
            name: team.full_name,
            abbreviation: team.abbr,
            conference: team.conference ?? 'N/A',
            division: team.division ?? 'N/A',
            record: records[team.team_id] ?? 'N/A',
            logo,
          },
        ];
      })
    );

    return Object.fromEntries(teamsEntries);
  }

  private createGames(
    gamesData: any,
    teamsMap: Record<string, Team>,
    league: League
  ): Game[] {
    return Object.values(gamesData)
      .filter((game: any) => this.shouldIncludeGame(game, league, teamsMap))
      .map((game: any) => this.createGameObject(game, teamsMap, league));
  }

  private shouldIncludeGame(
    game: any,
    league: League,
    teamsMap: Record<string, Team>
  ): boolean {
    switch (league) {
      case 'MLS':
        return game.subleague === LEAGUE_CONFIGS.MLS.subleague;
      case 'SerieA':
        return game.subleague === LEAGUE_CONFIGS.SerieA.subleague;
      case 'LaLiga':
        return game.subleague === LEAGUE_CONFIGS.LaLiga.subleague;
      case 'ChampionsLeague':
        return game.subleague === LEAGUE_CONFIGS.ChampionsLeague.subleague;
      case 'PremierLeague':
        return game.subleague === LEAGUE_CONFIGS.PremierLeague.subleague;
    }

    if (league === 'NCAAF') {
      const { home_team_id, away_team_id } = game;
      return this.state.favoriteTeams.NCAAF.some(
        (team) =>
          teamsMap[home_team_id].abbreviation === team ||
          teamsMap[away_team_id].abbreviation === team
      );
    }

    return true;
  }

  private createGameObject(
    game: any,
    teamsMap: Record<string, Team>,
    league: League
  ): Game {
    const startUtc = new Date(game.start_time);
    return {
      gameId: game.gameid,
      league,
      startUtc,
      startTime: this.formatGameTime(startUtc),
      homeTeam: teamsMap[game.home_team_id],
      awayTeam: teamsMap[game.away_team_id],
      homeScore: game.total_home_points,
      awayScore: game.total_away_points,
      status: game.status_display_name,
      statusType: game.status_type.replace(
        'status.type.',
        ''
      ) as GameStatusType,
      gameType: game.game_type,
      tvCoverage: game.tv_coverage ?? 'N/A',
      periods: this.createPeriods(game.game_periods),
      week: game.week_number,
    };
  }

  private formatGameTime(date: Date): string {
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    });
  }

  private createPeriods(periods: any[]): any[] {
    return periods.map((period) => ({
      periodId: period.period_id,
      name: period.display_name,
      awayPoints: period.away_points,
      homePoints: period.home_points,
    }));
  }

  private consolidateAndSortGames() {
    const allGames = Object.entries(this.sportsHubData)
      .filter(([key]) => key.endsWith('Games'))
      .flatMap(([, games]) => (games as Game[]) || []);

    this.sportsHubData.allGames = this.sortGames(allGames);
  }

  private sortGames(games: Game[]): Game[] {
    return games.sort((a, b) => {
      // Prioritize favorite teams first, regardless of status
      const aHasFavoriteTeam = this.hasTeamInGame(
        a,
        this.state.favoriteTeams[a.league as League]
      );
      const bHasFavoriteTeam = this.hasTeamInGame(
        b,
        this.state.favoriteTeams[b.league as League]
      );
      if (aHasFavoriteTeam !== bHasFavoriteTeam) {
        return aHasFavoriteTeam ? -1 : 1;
      }

      // Then sort by status
      const statusDiff =
        (STATUS_ORDER[a.statusType] ?? 0) - (STATUS_ORDER[b.statusType] ?? 0);
      if (statusDiff !== 0) return statusDiff;

      // Then prioritize favorite league
      if (this.state.favoriteLeague !== 'NONE') {
        const aIsFavoriteLeague = a.league === this.state.favoriteLeague;
        const bIsFavoriteLeague = b.league === this.state.favoriteLeague;
        if (aIsFavoriteLeague !== bIsFavoriteLeague) {
          return aIsFavoriteLeague ? -1 : 1;
        }
      }

      // Default sorting
      return 0;
    });
  }

  private hasTeamInGame(game: Game, favoriteTeams: string[]): boolean {
    return favoriteTeams.some(
      (team) =>
        game.homeTeam.abbreviation === team ||
        game.awayTeam.abbreviation === team
    );
  }

  private hasLiveGame(games: Game[]): boolean {
    return games.some(
      (game) =>
        game.statusType === 'in_progress' ||
        (game.statusType === 'pregame' && game.startUtc.getTime() < Date.now())
    );
  }

  private updateLastUpdateTime(now: Date) {
    this.lastUpdateTime = now;
    this.sportsHubData.lastUpdated = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  private scheduleIntervalUpdates() {
    if (this.updateTaskId) {
      this.updateTaskId();
    }

    this.updateTaskId = DeskThing.addBackgroundTaskLoop(async () => {
      await this.updateSportsHub();
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(1, this.state.refreshInterval) * 60 * 1000)
      );
    });
  }

  public updateData(data: DataInterface) {
    if (!data.settings) {
      DeskThing.sendWarning('No settings defined');
      return;
    }

    try {
      this.state = {
        refreshInterval: (data.settings.refreshInterval.value as number) || 1,
        leaguesToShow: (data.settings.leaguesToShow.value as string[]) || [],
        favoriteLeague:
          (data.settings.favoriteLeague.value as string) || 'NONE',
        favoriteTeams: {
          NBA: (data.settings.favoriteNBATeams.value as string[]) || [],
          NFL: (data.settings.favoriteNFLTeams.value as string[]) || [],
          MLB: (data.settings.favoriteMLBTeams.value as string[]) || [],
          NHL: (data.settings.favoriteNHLTeams.value as string[]) || [],
          NCAAF: (data.settings.selectedNCAAFTeams.value as string[]) || [],
          MLS: (data.settings.favoriteMLSTeams.value as string[]) || [],
          SerieA: (data.settings.favoriteSerieATeams.value as string[]) || [],
          LaLiga: (data.settings.favoriteLaLigaTeams.value as string[]) || [],
          ChampionsLeague:
            (data.settings.favoriteChampionsLeagueTeams.value as string[]) ||
            [],
          PremierLeague:
            (data.settings.favoritePremierLeagueTeams.value as string[]) || [],
        },
      };

      this.updateSportsHub();
    } catch (error) {
      DeskThing.sendWarning(`Error updating Sports Hub data: ${error}`);
    }
  }

  public async getSportsHub(): Promise<SportsHubData> {
    if (this.shouldRefreshData()) {
      await this.updateSportsHub();
    }
    return this.sportsHubData;
  }

  private shouldRefreshData(): boolean {
    return (
      !this.lastUpdateTime ||
      Date.now() - this.lastUpdateTime.getTime() > 15 * 60 * 1000
    );
  }

  public async stop() {
    this.lastUpdateTime = null;
    if (this.updateTaskId) {
      this.updateTaskId();
      this.updateTaskId = null;
    }
  }
}

export default SportsHubService;
