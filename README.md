# 🔐 Alan Vault

## Secure Cloud Platform for Modern Workspace

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/alanvault/alanvault)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![Docker Pulls](https://img.shields.io/docker/pulls/alanvault/alanvault)](https://hub.docker.com/r/alanvault/alanvault)

Alan Vault is a comprehensive secure cloud platform that combines file storage, note-taking, task management, and bookmarking in one modern interface.

![Alan Vault Dashboard](https://alanvault.com/images/dashboard-preview.png)

## ✨ Features

### 📁 File Management
- Upload, download, delete, and rename files
- Folder organization with drag-and-drop
- File preview for images, PDFs, and videos
- File sharing with password protection
- Batch operations and bulk upload
- File version history
- Trash and restore functionality

### 📝 Notes
- Rich text editor with markdown support
- Categories and tags for organization
- Pin important notes
- Auto-save functionality
- Export notes to JSON/Markdown/HTML
- Note version history

### ✅ Tasks
- Create tasks with priority levels (High/Medium/Low)
- Due dates and reminders
- Subtasks support
- Task categories and tags
- Task completion tracking
- Calendar view
- Recurring tasks

### 🔗 Bookmarks
- Save and organize web links
- Auto-fetch page titles and favicons
- Categories and tags
- Click tracking and analytics
- Import/export bookmarks

### 🔒 Security
- AES-256 encryption for stored files
- JWT-based authentication
- Session management with expiry
- Rate limiting and brute force protection
- XSS and CSRF protection
- SQL injection prevention
- Input validation and sanitization

### 👥 User Management
- User registration and login
- Password reset functionality
- Email verification
- Role-based access control (Admin/User)
- User profiles with avatars
- Account deletion with data cleanup

### 📊 Analytics
- Storage usage tracking
- Activity statistics
- User engagement metrics
- File type distribution
- Task completion rates
- Custom report generation

### 📱 PWA Support
- Install as native app
- Offline mode
- Push notifications
- Background sync
- Add to home screen

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ or PHP 8.1+
- Nginx/Apache (for production)
- MySQL/PostgreSQL (optional)
- Redis (optional for caching)

### Installation

#### Option 1: Using Docker (Recommended)
```bash
# Clone repository
git clone https://github.com/alanvault/alanvault.git
cd alanvault

# Copy environment file
cp .env.example .env

# Edit environment variables
nano .env

# Start services
docker-compose up -d

# Access application
open http://localhost:3000





# Clone repository
git clone https://github.com/alanvault/alanvault.git
cd alanvault

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit configuration
nano .env

# Start application
npm start

# Access application
open http://localhost:3000




# Clone repository
git clone https://github.com/alanvault/alanvault-php.git
cd alanvault-php

# Copy environment file
cp .env.example .env

# Set permissions
chmod -R 755 storage database
chmod -R 777 uploads

# Start PHP server
php -S localhost:8000

# Or configure with Nginx/Apache



# Install PM2 for process management
npm install -g pm2

# Start application
pm2 start server.js --name alanvault

# Save PM2 configuration
pm2 save
pm2 startup



┌─────────────────────────────────────────────────────────────┐
│                         Client                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Browser   │  │   Mobile    │  │    API      │        │
│  │   (PWA)     │  │    App      │  │   Client    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
├─────────────────────────────────────────────────────────────┤
│                      Load Balancer                          │
│                      (Nginx/ALB)                            │
├─────────────────────────────────────────────────────────────┤
│                    Application Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Node.js   │  │    PHP      │  │  WebSocket  │        │
│  │   Server    │  │   Server    │  │   Server    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
├─────────────────────────────────────────────────────────────┤
│                      Cache Layer                            │
│                    (Redis/Memcached)                        │
├─────────────────────────────────────────────────────────────┤
│                     Database Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    MySQL    │  │     JSON    │  │     S3      │        │
│  │   (Optional)│  │   Files     │  │   Storage   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘



# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e

# Run all tests with coverage
npm run test:coverage





## **LICENSE**

```text
MIT License

Copyright (c) 2024 Alan Vault

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.