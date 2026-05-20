import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
import bcrypt
import jwt
import datetime

app = Flask(__name__)
CORS(app) # Allow cross-origin requests from frontend

# Secret key for JWT
app.config['SECRET_KEY'] = 'neurocode-super-secret-key-2026'

# MySQL Configuration
db_config = {
    'host': '127.0.0.1',
    'port': 3306,
    'user': 'root',
    'password': '',
    'database': 'neurocode_db'
}

def get_db_connection():
    try:
        conn = mysql.connector.connect(**db_config)
        return conn
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

# Middleware for authenticating JWT
def token_required(f):
    def decorator(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
            
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = data['user_id']
        except Exception as e:
            return jsonify({'message': 'Token is invalid!'}), 401
            
        return f(current_user, *args, **kwargs)
    # preserve function name
    decorator.__name__ = f.__name__
    return decorator

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'message': 'Email and password required'}), 400
        
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500
        
    try:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (email, password_hash) VALUES (%s, %s)", (email, hashed_password))
        conn.commit()
        return jsonify({'message': 'User registered successfully'}), 201
    except mysql.connector.IntegrityError:
        return jsonify({'message': 'Email already exists'}), 409
    finally:
        cursor.close()
        conn.close()

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500
        
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()
    
    cursor.close()
    conn.close()
    
    if not user or not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
        return jsonify({'message': 'Invalid credentials'}), 401
        
    token = jwt.encode({
        'user_id': user['id'],
        'email': user['email'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, app.config['SECRET_KEY'], algorithm="HS256")
    
    return jsonify({'token': token, 'email': user['email']}), 200

@app.route('/api/keys', methods=['GET', 'POST'])
@token_required
def manage_keys(current_user):
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500
        
    cursor = conn.cursor(dictionary=True)
    
    if request.method == 'GET':
        cursor.execute("SELECT provider, api_key FROM api_keys WHERE user_id = %s", (current_user,))
        keys = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(keys), 200
        
    if request.method == 'POST':
        data = request.get_json()
        provider = data.get('provider')
        api_key = data.get('api_key')
        
        if not provider or not api_key:
            return jsonify({'message': 'Provider and API key required'}), 400
            
        cursor.execute("""
            INSERT INTO api_keys (user_id, provider, api_key) 
            VALUES (%s, %s, %s) 
            ON DUPLICATE KEY UPDATE api_key = %s
        """, (current_user, provider, api_key, api_key))
        
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'API key saved successfully'}), 200

@app.route('/api/history', methods=['GET', 'POST'])
@token_required
def manage_history(current_user):
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500
        
    cursor = conn.cursor(dictionary=True)
    
    if request.method == 'GET':
        cursor.execute("SELECT id, algorithm, complexity_time, complexity_space, executed_at FROM execution_history WHERE user_id = %s ORDER BY executed_at DESC LIMIT 50", (current_user,))
        history = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(history), 200
        
    if request.method == 'POST':
        data = request.get_json()
        algorithm = data.get('algorithm')
        code_content = data.get('code_content', '')
        input_data = data.get('input_data', '')
        time_comp = data.get('complexity_time', '')
        space_comp = data.get('complexity_space', '')
        
        cursor.execute("""
            INSERT INTO execution_history (user_id, algorithm, code_content, input_data, complexity_time, complexity_space) 
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (current_user, algorithm, code_content, input_data, time_comp, space_comp))
        
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'History saved successfully'}), 201

if __name__ == '__main__':
    # Start server on port 5000
    app.run(debug=True, port=5000)
