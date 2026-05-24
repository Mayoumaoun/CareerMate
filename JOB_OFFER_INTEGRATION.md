# Job Offer Module - Frontend Integration Guide

## Overview
The job-offer module has been successfully integrated into the frontend. Users can now:
- Browse job listings that match their profile
- Filter jobs by skills, location, experience level, and salary
- View detailed job information with skill matching analysis
- See personalized match scores based on their profile

## Integration Summary

### 1. **API Integration** 
Located in `Front-PPP/lib/api-client.ts` (copied from `frontend-integration/api-client.ts`)

**Endpoints available:**
- `careerMateAPI.jobOffer.getAllOffers()` - Get all job offers
- `careerMateAPI.jobOffer.getMatches(profileId, filters)` - Get matched jobs for a profile with optional filters
- `careerMateAPI.jobOffer.create(token, payload)` - Create a new job offer
- `careerMateAPI.jobOffer.update(token, jobId, payload)` - Update a job offer
- `careerMateAPI.jobOffer.delete(token, jobId)` - Delete a job offer

**Filter options:**
```typescript
interface MatchQueryDto {
  skills?: string[];
  location?: string[];
  experienceLevel?: string[];
  salaryMin?: number;
  salaryMax?: number;
}
```

### 2. **Frontend Components**

#### **Jobs Listing Page** (`Front-PPP/app/jobs/page.tsx`)
- Main page displaying job listings
- Real-time data fetching from backend
- Responsive layout with sidebar filters on desktop
- Loading and error states
- Empty state handling
- Automatic redirect to onboarding if user not authenticated

**Features:**
- Displays matched jobs based on user profile
- Shows match percentage for each job
- Loading spinner during fetch
- Error messages with graceful fallback

#### **Job Card Component** (`Front-PPP/components/jobs/job-card.tsx`)
- Reusable card for displaying job information
- Shows:
  - Company name
  - Job title
  - Match percentage with color coding
  - Location and experience level
  - Salary range
  - Required skills with +more badge
  - Matched/Missing skills indicators
  - Call-to-action buttons (View Details, Save)

**Color coding for match scores:**
- 🟢 Green: 80%+ match
- 🟡 Yellow: 60-80% match
- 🔴 Red: Below 60% match

#### **Filter Sidebar** (`Front-PPP/components/jobs/filter-sidebar.tsx`)
- Multi-select filters for:
  - **Skills**: React, TypeScript, Node.js, Python, AWS, JavaScript, Java, Go, Rust, PostgreSQL
  - **Locations**: Remote, San Francisco, New York, London, Berlin, Toronto, Sydney
  - **Experience Level**: Entry Level, Mid Level, Senior, Lead
  - **Salary Range**: $50k-$75k, $75k-$100k, $100k-$150k, $150k+
- Real-time filter updates
- Reset filters button
- Sticky positioning for easy access while scrolling

#### **Job Details Page** (`Front-PPP/app/jobs/[id]/page.tsx`)
- Full job information display
- Detailed skill matching analysis:
  - ✓ Your matched skills (in green)
  - ↻ Skills to learn (in amber)
- Match score breakdown
- Company and position details
- Apply and Save buttons
- Back navigation

### 3. **Data Types** (`Front-PPP/lib/types.ts`)

**Job Offer Data Structure:**
```typescript
interface MatchResultDto {
  jobId: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  remote: boolean;
  experienceLevel: string;
  salaryMin?: number;
  salaryMax?: number;
  description: string;
  skills: string[];
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
}
```

## Environment Configuration

Create `Front-PPP/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Adjust the URL based on your backend server location:
- Development: `http://localhost:3000`
- Production: `https://api.careermate.com`

## User Authentication Flow

1. User logs in and is redirected to dashboard
2. User ID is stored in `localStorage` as `userId`
3. When viewing jobs page, `profileId` is retrieved from localStorage
4. Jobs are fetched using the profile ID for personalized matching

**If user not authenticated:**
- Automatically redirects to `/onboarding` page

## Feature Highlights

### ✅ Smart Job Matching
- Backend calculates match scores based on user skills
- Visual indicators for skill gaps
- Personalized recommendations

### ✅ Advanced Filtering
- Multi-select filters for precise job search
- Real-time filter application
- Salary range filtering

### ✅ Responsive Design
- Mobile-friendly layout
- Sidebar hidden on mobile, collapsible
- Touch-optimized filter controls

### ✅ Performance
- Loading states with spinners
- Lazy data fetching
- Error handling with user-friendly messages

### ✅ Accessibility
- Semantic HTML structure
- Proper ARIA labels
- Keyboard navigation support

## API Integration Details

### Making Job Requests

**Get matches for a profile:**
```typescript
const token = localStorage.getItem('access_token');
const profileId = localStorage.getItem('userId');

const jobs = await careerMateAPI.jobOffer.getMatches(profileId, {
  skills: ['React', 'TypeScript'],
  location: ['Remote'],
  experienceLevel: ['Mid Level', 'Senior'],
  salaryMin: 100000,
  salaryMax: 200000
});
```

**Get all jobs:**
```typescript
const allJobs = await careerMateAPI.jobOffer.getAllOffers();
```

## Backend Requirements

The backend should provide:
1. `GET /job-offer` - List all job offers
2. `GET /job-offer/:profileId` - Get matched jobs for a profile with optional query filters
3. `POST /job-offer` - Create a new job offer (requires auth)
4. `PATCH /job-offer/:id` - Update a job offer (requires auth)
5. `DELETE /job-offer/:id` - Delete a job offer (requires auth)

### Query Parameters for Matching
- `skills`: JSON array of skill strings
- `location`: JSON array of location strings
- `experienceLevel`: JSON array of experience levels
- `salaryMin`: Minimum salary (number)
- `salaryMax`: Maximum salary (number)

## File Structure
```
Front-PPP/
├── app/
│   └── jobs/
│       ├── page.tsx (Main jobs listing)
│       └── [id]/
│           └── page.tsx (Job details)
├── components/
│   └── jobs/
│       ├── job-card.tsx
│       └── filter-sidebar.tsx
└── lib/
    ├── api-client.ts
    └── types.ts
```

## Next Steps / Future Enhancements

1. **Save Functionality**: Implement job saving feature
2. **Application Tracking**: Track applications submitted
3. **Notifications**: Alert users about new matching jobs
4. **Advanced Analytics**: Show job market insights
5. **Direct Apply**: Integrate with job boards for direct applications
6. **PDF Export**: Generate job-specific CV recommendations
7. **Interview Prep**: Prepare candidates based on job requirements

## Troubleshooting

### Jobs not loading
- Check if backend is running on the correct port (3000)
- Verify `NEXT_PUBLIC_API_URL` in `.env.local`
- Check browser console for API errors
- Ensure user is authenticated (localStorage has `userId`)

### Filter not working
- Check if ProfileId is in localStorage
- Verify backend filtering logic
- Check browser network tab for filter request parameters

### Match scores seem incorrect
- Verify user profile skills are saved in backend
- Check job skills data in database
- Verify matching algorithm in backend

## API Error Handling

The API client automatically handles:
- Network errors with timeout (30 seconds)
- HTTP error responses with proper status codes
- JSON parsing errors
- Missing fields with graceful fallbacks

All errors are thrown as `ApiError` with:
```typescript
class ApiError extends Error {
  statusCode: number;
  message: string;
  errors?: Record<string, any>;
}
```

## Testing Checklist

- [ ] Jobs page loads without errors
- [ ] Jobs display with correct data from backend
- [ ] Filters update results in real-time
- [ ] Job details page opens when clicking a job
- [ ] Back button works from job details page
- [ ] Save/Unsave button toggles state
- [ ] Empty state shows when no jobs match
- [ ] Error state displays on API failure
- [ ] Mobile responsive layout works
- [ ] Loading spinner appears during fetch
