import { Low, JSONFile } from 'lowdb';
import { IConfig } from '../types/IConfig';

const adapter = new JSONFile<Partial<IConfig>>('./db.json');
const db = new Low(adapter);

export default db;
