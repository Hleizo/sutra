#!/bin/bash

# Virtual Mirror - Quick Start Script for Linux/Mac

echo -e "\033[36mVirtual Mirror - Docker Setup\033[0m"
echo ""

echo "Choose action:"
echo "  1) Production mode"
echo "  2) Development mode"
echo "  3) Stop containers"
echo "  4) Clean (remove volumes)"
echo "  5) View logs"
echo ""

read -p "Enter choice (1-5): " action

case $action in
    1)
        echo -e "\033[32mStarting production mode...\033[0m"
        docker-compose up -d --build
        echo ""
        echo -e "\033[32mApplication started!\033[0m"
        echo -e "\033[33mFrontend: http://localhost:3000\033[0m"
        echo -e "\033[33mBackend: http://localhost:8000\033[0m"
        echo -e "\033[33mAPI Docs: http://localhost:8000/docs\033[0m"
        ;;
    2)
        echo -e "\033[32mStarting development mode...\033[0m"
        docker-compose -f docker-compose.dev.yml up -d --build
        echo ""
        echo -e "\033[32mApplication started in dev mode!\033[0m"
        echo -e "\033[33mFrontend: http://localhost:5173\033[0m"
        echo -e "\033[33mBackend: http://localhost:8000\033[0m"
        echo -e "\033[33mAPI Docs: http://localhost:8000/docs\033[0m"
        ;;
    3)
        echo -e "\033[33mStopping containers...\033[0m"
        docker-compose down
        docker-compose -f docker-compose.dev.yml down
        echo -e "\033[32mContainers stopped\033[0m"
        ;;
    4)
        echo -e "\033[33mCleaning up (removing volumes)...\033[0m"
        docker-compose down -v
        docker-compose -f docker-compose.dev.yml down -v
        echo -e "\033[32mCleanup complete\033[0m"
        ;;
    5)
        echo -e "\033[33mShowing logs (Ctrl+C to exit)...\033[0m"
        docker-compose logs -f
        ;;
    *)
        echo -e "\033[31mInvalid option\033[0m"
        ;;
esac
