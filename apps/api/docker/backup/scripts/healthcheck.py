#!/usr/bin/env python3
from http.server import HTTPServer, BaseHTTPRequestHandler
import os
import json
import subprocess
from datetime import datetime
import glob

class HealthCheckHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            try:
                # Check PostgreSQL connection
                subprocess.run([
                    'pg_isready',
                    '-h', os.environ.get('POSTGRES_HOST', 'postgres'),
                    '-p', os.environ.get('POSTGRES_PORT', '5432'),
                    '-U', os.environ.get('POSTGRES_USER', 'admin')
                ], check=True)

                # Check backup directory
                backup_dir = '/backups'
                if not os.path.exists(backup_dir):
                    raise Exception('Backup directory not found')

                # Get latest backup info
                backup_files = glob.glob(os.path.join(backup_dir, '*.sql.gz'))
                latest_backup = None
                if backup_files:
                    latest_backup = max(backup_files, key=os.path.getctime)
                    latest_backup_time = datetime.fromtimestamp(os.path.getctime(latest_backup))
                    latest_backup_info = {
                        'file': os.path.basename(latest_backup),
                        'size': os.path.getsize(latest_backup),
                        'created_at': latest_backup_time.isoformat()
                    }
                
                # Check S3 connection if configured
                s3_status = 'not_configured'
                if os.environ.get('S3_BUCKET'):
                    try:
                        subprocess.run(['aws', 's3', 'ls'], check=True)
                        s3_status = 'connected'
                    except:
                        s3_status = 'error'

                # Prepare response
                response = {
                    'status': 'healthy',
                    'timestamp': datetime.utcnow().isoformat(),
                    'components': {
                        'postgres': 'connected',
                        's3': s3_status
                    },
                    'latest_backup': latest_backup_info if latest_backup else None,
                    'backup_stats': {
                        'total_backups': len(backup_files),
                        'total_size': sum(os.path.getsize(f) for f in backup_files),
                        'backup_dir': backup_dir
                    }
                }

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(response, indent=2).encode())

            except Exception as e:
                error_response = {
                    'status': 'unhealthy',
                    'timestamp': datetime.utcnow().isoformat(),
                    'error': str(e)
                }
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(error_response, indent=2).encode())
        else:
            self.send_response(404)
            self.end_headers()

def run_server(port=8080):
    server_address = ('', port)
    httpd = HTTPServer(server_address, HealthCheckHandler)
    print(f'Starting health check server on port {port}...')
    httpd.serve_forever()

if __name__ == '__main__':
    port = int(os.environ.get('HEALTHCHECK_PORT', 8080))
    run_server(port)
