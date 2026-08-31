#!/usr/bin/env bash
set -e

# Configure port and listen addresses
sed -i 's/^port = .*/port = 54329/' /etc/postgresql/16/main/postgresql.conf
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/16/main/postgresql.conf
sed -i "s/listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/16/main/postgresql.conf

# Add auth rules
if ! grep -q "0.0.0.0/0" /etc/postgresql/16/main/pg_hba.conf; then
  echo "host all all 0.0.0.0/0 md5" >> /etc/postgresql/16/main/pg_hba.conf
  echo "host all all ::0/0 md5" >> /etc/postgresql/16/main/pg_hba.conf
fi

# Restart postgres
service postgresql restart

# Create user and db
su - postgres -c "psql -p 54329 -c \"DO \\\$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'tonala') THEN CREATE ROLE tonala WITH LOGIN SUPERUSER PASSWORD 'tonala_dev_password'; END IF; END \\\$\$;\""
su - postgres -c "psql -p 54329 -tc \"SELECT 1 FROM pg_database WHERE datname = 'tonala_os'\" | grep -q 1 || psql -p 54329 -c \"CREATE DATABASE tonala_os OWNER tonala;\""

echo "POSTGRES_READY_SUCCESS"
