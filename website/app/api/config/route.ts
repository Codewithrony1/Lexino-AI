import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CONFIG_FILE = path.join(process.cwd(), 'lai-config.json');

const defaultConfig = {
  'timetable-lai': true,
  'predict-lai': false,
  'explore-lais': true
};

export async function GET() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
      return NextResponse.json(JSON.parse(raw || '{}'));
    }
  } catch (e) {}
  return NextResponse.json(defaultConfig);
}
