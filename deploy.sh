#!/bin/bash
cd /var/www/scfc-erp
git pull
npm install
pm2 restart scfc-erp
