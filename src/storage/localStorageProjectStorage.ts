import { ProjectState } from '../model/types';
import { ProjectStorage } from './types';

const STORAGE_KEY_PREFIX = 'stem_arranger_project_';

export class LocalStorageProjectStorage implements ProjectStorage {
  private getStorageKey(id: string = 'default'): string {
    return `${STORAGE_KEY_PREFIX}${id}`;
  }

  async loadProject(id: string = 'default'): Promise<ProjectState | null> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return null;
      }
      const raw = window.localStorage.getItem(this.getStorageKey(id));
      if (!raw) return null;

      const parsed = JSON.parse(raw) as ProjectState;
      // Basic integrity check
      if (typeof parsed.bpm !== 'number' || !parsed.pieces || !Array.isArray(parsed.clips)) {
        return null;
      }
      return parsed;
    } catch (err) {
      console.warn('Failed to load project from localStorage:', err);
      return null;
    }
  }

  async saveProject(state: ProjectState, id: string = 'default'): Promise<void> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }
      // Serialize only clean state
      const serialized = JSON.stringify(state);
      window.localStorage.setItem(this.getStorageKey(id), serialized);
    } catch (err) {
      console.warn('Failed to save project to localStorage:', err);
    }
  }

  async clearProject(id: string = 'default'): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(this.getStorageKey(id));
      }
    } catch (err) {
      console.warn('Failed to clear project from localStorage:', err);
    }
  }
}

export const defaultProjectStorage = new LocalStorageProjectStorage();

