export type ID = string;

export type SaveStatus = 'saved' | 'saving' | 'offline' | 'error';

export interface UserProfile {
  id: ID;
  email: string;
  name: string;
  displayName?: string;
  title?: string;
  avatarUrl?: string;
  role: 'owner' | 'co-founder' | 'admin' | 'member' | 'viewer' | 'co-owner';
}

export interface Workspace {
  id: ID;
  name: string;
  icon: string;
  ownerId: ID;
  members: UserProfile[];
  createdAt: number;
  updatedAt: number;
}

export interface PageComment {
  id: ID;
  authorName: string;
  avatarUrl?: string;
  content: string;
  createdAt: number;
}

export interface Page {
  id: ID;
  workspaceId: ID;
  parentId: ID | null;
  title: string;
  icon: string | null;
  coverImage: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  type: 'doc' | 'database';
  content?: any; // TipTap JSON content
  comments?: PageComment[];
  order: number;
  createdAt: number;
  updatedAt: number;
}

export type PropertyType =
  | 'title'
  | 'text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'status'
  | 'date'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone'
  | 'person'
  | 'formula'
  | 'relation'
  | 'rollup'
  | 'created_time'
  | 'last_edited_time';

export interface SelectOption {
  id: ID;
  name: string;
  color: string;
}

export type RollupFunction = 'count' | 'count_values' | 'sum' | 'avg' | 'min' | 'max' | 'show_original';

export interface DatabaseProperty {
  id: ID;
  name: string;
  type: PropertyType;
  options?: SelectOption[];
  formulaExpression?: string;
  relationDatabaseId?: ID;
  relationPropertyId?: ID;
  rollupRelationId?: ID;
  rollupPropertyId?: ID;
  rollupFunction?: RollupFunction;
}

export type ViewType = 'table' | 'board' | 'calendar' | 'gallery' | 'list' | 'timeline';

export interface DatabaseView {
  id: ID;
  name: string;
  type: ViewType;
  groupBy?: string; // Property ID for Board/Kanban
  sorts: { propertyId: ID; direction: 'asc' | 'desc' }[];
  filters: { propertyId: ID; operator: string; value: any }[];
  visiblePropertyIds: ID[];
}

export interface DatabaseRecord {
  id: ID;
  pageId?: ID; // if this record also has its own page content
  values: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface Database {
  id: ID;
  pageId: ID;
  title: string;
  properties: DatabaseProperty[];
  views: DatabaseView[];
  records: DatabaseRecord[];
  createdAt: number;
  updatedAt: number;
}

export interface SearchResult {
  page: Page;
  snippet?: string;
  matchType: 'title' | 'content';
}
