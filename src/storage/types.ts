import { ProjectState } from '../model/types';

export interface ProjectStorage {
  loadProject(id?: string): Promise<ProjectState | null>;
  saveProject(state: ProjectState, id?: string): Promise<void>;
  clearProject(id?: string): Promise<void>;
}

