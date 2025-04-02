#!/bin/bash
cd /var/www/scfc-erp
git fetch
git checkout production-fixes  # Always use this branch in production
git pull origin production-fixes
npm install
pm2 restart scfc-erp
