import { DeskThing } from 'deskthing-client';
import { SocketData } from 'deskthing-server';

export type SportsHubData = {
  /**
   * Game list (all leagues)
   */
  allGames: Game[];
  /**
   * NBA Game list
   */
  nbaGames?: Game[];
  /**
   * NBA Game list
   */
  nflGames?: Game[];
  /**
   * MLS Game list
   */
  mlsGames?: Game[];
  /**
   * NCAA Football Game list
   */
  ncaafGames?: Game[];
  /**
   * Last Refreshed Time
   */
  lastUpdated?: string;
};

export enum League {
  NBA = 'NBA',
  NFL = 'NFL',
  MLS = 'MLS',
  NCAAF = 'NCAAF',
}

export type Team = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  abbreviation: string;
  conference: string;
  division: string;
  record: string;
  logo: string;
};

export type Player = {
  id: string;
  firstName: string;
  lastName: string;
  teamId: string;
  uniformNumber: string;
};

export type Period = {
  periodId: number;
  name: string;
  awayPoints: string;
  homePoints: string;
};

export type GameStatusType = 'pregame' | 'in_progress' | 'final' | 'postponed';

export type Game = {
  gameId: string;
  league: string;
  startUtc: Date;
  startTime: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: string | null;
  awayScore: string | null;
  status: string;
  statusType: GameStatusType;
  tvCoverage: string;
  gameType: string;
  periods: Period[];
  week: string;
};

type SportsHubListener = (sportsHubData: SportsHubData | null) => void;

export class SportsHubStore {
  private static instance: SportsHubStore | null = null;
  private sportsHubData: SportsHubData | null = null;
  private deskThing: DeskThing;
  private listeners: SportsHubListener[] = [];

  constructor() {
    this.deskThing = DeskThing.getInstance();
    this.deskThing.on('sportshub', (data: SocketData) => {
      this.sportsHubData = data.payload as SportsHubData;
      this.notifyListeners();
    });

    this.requestSportsHubData();
  }

  static getInstance(): SportsHubStore {
    if (!SportsHubStore.instance) {
      SportsHubStore.instance = new SportsHubStore();
    }
    return SportsHubStore.instance;
  }

  on(listener: SportsHubListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
  getSportsHubData(): SportsHubData | null {
    if (!this.sportsHubData) {
      this.requestSportsHubData();
    }
    return this.sportsHubData;
  }

  private notifyListeners() {
    if (!this.sportsHubData) {
      this.getSportsHubData();
    }
    this.deskThing.sendMessageToParent({
      app: 'client',
      type: 'log',
      payload: 'Getting Sports Hub data',
    });
    this.listeners.forEach((listener) => listener(this.sportsHubData));
  }
  async requestSportsHubData(): Promise<void> {
    this.deskThing.sendMessageToParent({
      type: 'get',
      request: 'sportshub_data',
    });
  }
}

export default SportsHubStore.getInstance();
