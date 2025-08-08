# SurveyJS + NextJS Survey Management System

A comprehensive survey management system built with Next.js and SurveyJS, featuring admin authentication, user OTP login, survey creation, and result analytics.

## 🚀 Features

### Admin Panel
- **Secure Login**: Email/password authentication for administrators
- **Survey Management**: Create, edit, and manage surveys using SurveyJS Creator
- **Dashboard**: View all surveys with options to edit, preview, view results, and generate PDF
- **Survey Settings**: Configure one-time vs multiple submissions per user
- **Results Analytics**: View survey responses and generate reports

### User Portal
- **OTP Authentication**: Secure login with 6-digit OTP verification
- **Survey Taking**: Complete assigned surveys with responsive interface
- **Submission Control**: Prevents duplicate submissions for one-time surveys
- **User Experience**: Clean, intuitive interface for survey completion

### Technical Features
- **JSON-based Data**: All data stored in JSON files for easy development
- **API Simulation**: RESTful API endpoints that simulate backend services
- **Responsive Design**: Modern UI with Tailwind CSS
- **TypeScript**: Full type safety throughout the application

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd surveyjs-nextjs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
surveyjs-nextjs/
├── data/                    # JSON data files
│   ├── admins.json         # Admin credentials
│   ├── users.json          # User records with OTP
│   ├── surveys.json        # Survey definitions
│   └── results.json        # Survey responses
├── src/
│   ├── app/                # Next.js app router
│   │   ├── admin/          # Admin pages
│   │   │   ├── login/      # Admin login
│   │   │   ├── dashboard/  # Survey management
│   │   │   └── creator/    # Survey builder
│   │   ├── user/           # User pages
│   │   │   ├── login/      # OTP login
│   │   │   └── survey/     # Survey taking
│   │   └── api/            # API endpoints
│   └── components/         # React components
└── public/                 # Static assets
```

## 📊 Data Structure

### Admins (`data/admins.json`)
```json
[
  {
    "id": "admin1",
    "email": "admin@surveyjs.com",
    "password": "admin123",
    "name": "Survey Admin"
  }
]
```

### Users (`data/users.json`)
```json
[
  {
    "id": "user1",
    "email": "user1@example.com",
    "phone": "+1234567890",
    "otp": "123456",
    "assignedSurvey": "survey1",
    "hasSubmitted": false,
    "submittedAt": null
  }
]
```

### Surveys (`data/surveys.json`)
```json
[
  {
    "id": "survey1",
    "title": "Product Feedback Survey",
    "adminId": "admin1",
    "description": "A comprehensive survey to gather product feedback",
    "canTakeMultiple": false,
    "createdAt": "2024-01-10T09:00:00Z",
    "updatedAt": "2024-01-10T09:00:00Z",
    "json": {
      "title": "Product Feedback Survey",
      "showProgressBar": true,
      "pages": [...]
    }
  }
]
```

### Results (`data/results.json`)
```json
[
  {
    "id": "result1",
    "surveyId": "survey1",
    "userId": "user1",
    "adminId": "admin1",
    "submittedAt": "2024-01-15T10:30:00Z",
    "data": {
      "Quality": {
        "affordable": 4,
        "does what it claims": 5
      },
      "satisfaction": 4,
      "suggestions": "Great product!"
    }
  }
]
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/users/otp` - User OTP verification

### Surveys
- `GET /api/surveys` - List surveys (with optional adminId filter)
- `POST /api/surveys` - Create new survey
- `GET /api/surveys/[id]` - Get specific survey
- `PUT /api/surveys/[id]` - Update survey
- `DELETE /api/surveys/[id]` - Delete survey

### Results
- `GET /api/results` - List results (with optional surveyId/adminId filters)
- `POST /api/results` - Submit survey results

## 🎯 Usage Guide

### For Administrators

1. **Login**: Navigate to `/admin/login` and use credentials from `data/admins.json`
2. **Create Survey**: Click "Create New Survey" in the dashboard
3. **Design Survey**: Use SurveyJS Creator to build your survey
4. **Configure Settings**: Set title, description, and submission type
5. **Manage Surveys**: View, edit, preview, and delete surveys from dashboard
6. **View Results**: Access analytics and generate PDF reports

### For Users

1. **Login**: Navigate to `/user/login` and enter email/phone
2. **Enter OTP**: Input the 6-digit OTP from `data/users.json`
3. **Take Survey**: Complete the assigned survey
4. **Submit**: Results are automatically saved to `data/results.json`

### Adding Test Data

#### Add Admin
Edit `data/admins.json`:
```json
{
  "id": "admin3",
  "email": "newadmin@example.com",
  "password": "password123",
  "name": "New Admin"
}
```

#### Add User
Edit `data/users.json`:
```json
{
  "id": "user4",
  "email": "newuser@example.com",
  "phone": "+1555123456",
  "otp": "654321",
  "assignedSurvey": "survey1",
  "hasSubmitted": false,
  "submittedAt": null
}
```

#### Add Survey
Edit `data/surveys.json`:
```json
{
  "id": "survey3",
  "title": "Customer Satisfaction",
  "adminId": "admin1",
  "description": "Measure customer satisfaction",
  "canTakeMultiple": true,
  "createdAt": "2024-01-20T10:00:00Z",
  "updatedAt": "2024-01-20T10:00:00Z",
  "json": {
    "title": "Customer Satisfaction Survey",
    "showProgressBar": true,
    "pages": [...]
  }
}
```

## 🔄 API Integration Preparation

The system is designed for easy transition to real backend services:

### Current Implementation
- All data operations use JSON files
- API endpoints simulate RESTful services
- Fetch API used for all data operations

### Future Backend Integration
1. **Replace API Routes**: Update `/src/app/api/` endpoints to connect to your backend
2. **Database Migration**: Replace JSON files with database tables
3. **Authentication**: Implement proper JWT/session management
4. **Environment Variables**: Add configuration for backend URLs

### Example Backend Integration
```typescript
// Replace fetch calls with your API client
const response = await fetch('/api/surveys', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}` // Add auth headers
  },
  body: JSON.stringify(surveyData),
});
```

## 🎨 Customization

### Styling
- Uses Tailwind CSS for styling
- Customize colors and components in `tailwind.config.ts`
- Modify component styles in individual files

### SurveyJS Configuration
- SurveyJS Creator options in `/src/app/admin/creator/page.tsx`
- Survey display options in `/src/app/user/survey/page.tsx`
- Analytics configuration in existing dashboard pages

### Adding Features
- **Email Notifications**: Add email service integration
- **File Uploads**: Configure SurveyJS file upload settings
- **Advanced Analytics**: Extend dashboard with custom charts
- **Multi-language**: Add i18n support for surveys

## 🚀 Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect repository to Vercel
3. Deploy automatically

### Other Platforms
- **Netlify**: Configure build settings
- **AWS**: Use Next.js static export
- **Docker**: Create Dockerfile for containerization

## 🐛 Troubleshooting

### Common Issues

1. **SurveyJS Creator not loading**
   - Check browser console for errors
   - Ensure all SurveyJS packages are installed

2. **API endpoints returning 500**
   - Verify JSON files exist in `/data/` directory
   - Check file permissions

3. **OTP verification failing**
   - Ensure user exists in `data/users.json`
   - Verify OTP matches exactly

4. **Survey not saving**
   - Check admin authentication
   - Verify survey JSON structure

### Development Tips

- Use browser dev tools to debug API calls
- Check Network tab for failed requests
- Verify localStorage for authentication state
- Test with different browsers for compatibility

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review SurveyJS documentation
- Open an issue on GitHub

---

**Built with ❤️ using Next.js and SurveyJS**