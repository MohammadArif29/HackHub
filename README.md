# HackHub - Hackathon Management Platform

HackHub is a comprehensive platform for managing hackathons, connecting organizers, participants, and judges in a seamless environment.

## Features

### For Organizers
- Create and manage hackathons
- Track participant registrations
- Manage judge assignments
- Monitor project submissions
- View real-time statistics
- Handle team formations
- Manage prize pools and rules

### For Participants
- Browse available hackathons
- Register for hackathons
- Form and manage teams
- Submit projects
- Track submission status
- View achievements
- Access hackathon resources

### For Judges
- Review project submissions
- Provide feedback and scores
- Manage evaluation criteria
- Track review progress
- Access submission details
- View hackathon statistics

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- Socket.IO for real-time features

### Frontend
- HTML5/CSS3
- JavaScript
- Bootstrap 5
- EJS Templating
- Font Awesome Icons

## Project Structure
```
├── backend/
│   ├── middleware/     # Authentication and other middleware
│   ├── models/        # Database models
│   ├── routes/        # API routes
│   ├── scripts/       # Utility scripts
│   ├── uploads/       # File uploads
│   └── server.js      # Main server file
├── frontend/
│   ├── assets/        # Static assets (CSS, JS, images)
│   ├── pages/         # HTML pages
│   └── views/         # EJS templates
└── package.json       # Project dependencies
```

## Database Models

### User
- Basic user information
- Role-based access (participant/organizer/judge)
- Authentication details

### Hackathon
- Event details
- Timeline
- Rules and requirements
- Prize pool
- Participant and judge assignments

### Team
- Team information
- Member management
- Project details
- Hackathon association

### Submission
- Project details
- GitHub links
- Demo links
- Evaluation status
- Judge feedback

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/MohammadArif29/HackHub.git
cd HackHub
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=3000
NODE_ENV=development
```

4. Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- POST `/api/auth/login` - User login
- POST `/api/auth/register` - User registration
- GET `/api/auth/logout` - User logout

### Hackathons
- GET `/api/hackathons` - List all hackathons
- POST `/api/hackathons` - Create new hackathon
- GET `/api/hackathons/:id` - Get hackathon details
- PUT `/api/hackathons/:id` - Update hackathon
- DELETE `/api/hackathons/:id` - Delete hackathon

### Teams
- GET `/api/teams` - List teams
- POST `/api/teams` - Create team
- GET `/api/teams/:id` - Get team details
- PUT `/api/teams/:id` - Update team
- DELETE `/api/teams/:id` - Delete team

### Submissions
- GET `/api/submissions` - List submissions
- POST `/api/submissions` - Create submission
- GET `/api/submissions/:id` - Get submission details
- PUT `/api/submissions/:id` - Update submission
- DELETE `/api/submissions/:id` - Delete submission

## Security Features
- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- HTTP-only cookies
- CORS protection
- Input validation
- XSS protection

## Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License
This project is licensed under the MIT License - see the LICENSE file for details

## Acknowledgments
- Bootstrap for the UI framework
- Font Awesome for icons
- MongoDB for the database
- Express.js for the backend framework 
