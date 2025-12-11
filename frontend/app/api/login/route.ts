import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Get credentials from environment variables (expected as JSON arrays)
    const usernameEnv = process.env.LOGIN_USERNAME;
    const passwordEnv = process.env.LOGIN_PASSWORD;

    // Validate environment variables exist
    if (!usernameEnv || !passwordEnv) {
      console.error('Missing LOGIN_USERNAME or LOGIN_PASSWORD environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Parse arrays from environment variables
    let validUsernames: string[];
    let validPasswords: string[];

    try {
      validUsernames = JSON.parse(usernameEnv);
      validPasswords = JSON.parse(passwordEnv);
    } catch (parseError) {
      console.error('Failed to parse LOGIN_USERNAME or LOGIN_PASSWORD as JSON arrays:', parseError);
      return NextResponse.json(
        { error: 'Server configuration error: Invalid format' },
        { status: 500 }
      );
    }

    // Validate arrays are actually arrays and have matching lengths
    if (!Array.isArray(validUsernames) || !Array.isArray(validPasswords)) {
      console.error('LOGIN_USERNAME and LOGIN_PASSWORD must be JSON arrays');
      return NextResponse.json(
        { error: 'Server configuration error: Must be arrays' },
        { status: 500 }
      );
    }

    if (validUsernames.length !== validPasswords.length) {
      console.error('LOGIN_USERNAME and LOGIN_PASSWORD arrays must have the same length');
      return NextResponse.json(
        { error: 'Server configuration error: Array length mismatch' },
        { status: 500 }
      );
    }

    // Find the index of the username
    const usernameIndex = validUsernames.findIndex(u => u === username);

    // Validate credentials by checking if username exists and password matches at same index
    if (usernameIndex === -1 || validPasswords[usernameIndex] !== password) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Set authentication cookie (expires in 7 days)
    const cookieStore = await cookies();
    cookieStore.set('auth-token', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'An error occurred during login',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

