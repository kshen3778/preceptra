#!/bin/bash
set -e

echo "Starting Preceptra..."

# Function to restart Supabase
restart_supabase() {
  echo "Restarting Supabase..."
  npx supabase stop
  npx supabase start
  echo "Supabase restarted successfully!"
}


echo "Checking for --restart-supabase flag..."
# Check for --restart-supabase flag
if [[ "$*" == *"--restart-supabase"* ]]; then
  echo "Restarting Supabase..."
  restart_supabase
  # Remove the --restart-supabase flag from arguments for further processing
  args=()
  for arg in "$@"; do
    if [ "$arg" != "--restart-supabase" ]; then
      args+=("$arg")
    fi
  done
  set -- "${args[@]}"
fi

echo "Changing directory to frontend..."
cd frontend/

echo "Checking for --prod flag..."
# Check if --prod flag is passed
if [ "$1" == "--prod" ]; then
  echo "Building the application..."
  npm run build
  echo "Starting the application..."
  npm run start
elif [ "$1" == "--prod" ] && [ "$2" == "--env" ] && [ -n "$3" ]; then
  echo "Building the application..."
  npm run build
  echo "Starting the application with custom environment file: $3"
  export $(cat "$3" | xargs) && npm run start
elif [ "$1" == "--env" ] && [ -n "$2" ]; then
  echo "Starting with custom environment file: $2"
  export $(cat "$2" | xargs) && npm run dev
else
  echo "Starting the application in development mode..."
  npm run dev
fi
