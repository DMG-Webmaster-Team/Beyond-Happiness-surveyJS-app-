import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    // Read admins from JSON file
    const adminsPath = path.join(process.cwd(), 'data', 'admins.json');
    const adminsData = fs.readFileSync(adminsPath, 'utf8');
    const admins = JSON.parse(adminsData);
    
    // Find admin with matching credentials
    const admin = admins.find((a: any) => 
      a.email === email && a.password === password
    );
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Return admin data (excluding password)
    const { password: _, ...adminData } = admin;
    
    return NextResponse.json({
      success: true,
      admin: adminData
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 