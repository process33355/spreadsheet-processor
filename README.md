# Spreadsheet Processor

A modern web application for processing and transforming spreadsheet data with an intuitive interface.

## Features

- 📊 Upload and process Excel/CSV files
- 🎯 Column selection and data mapping
- 📋 Template-based data transformation
- 💾 Save and load processing presets
- 📱 Responsive design for mobile and desktop
- 🌙 Dark/light theme support

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd spreadsheet-processor
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Deployment

### Option 1: Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign up/Login with GitHub
   - Click "New Project"
   - Import your repository
   - Deploy automatically

3. **Custom Domain (Optional)**
   - Add your domain in Vercel dashboard
   - Update DNS records as instructed

### Option 2: Netlify

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Drag and drop the `.next` folder
   - Or connect your GitHub repository

### Option 3: Railway

1. **Connect to Railway**
   - Go to [railway.app](https://railway.app)
   - Connect your GitHub repository
   - Railway will auto-detect Next.js and deploy

## Environment Variables

Create a `.env.local` file for local development:

```env
# Add any environment variables here
NEXT_PUBLIC_APP_NAME=Spreadsheet Processor
```

## Usage

1. **Upload a File**
   - Drag and drop or click to upload Excel/CSV files
   - Supported formats: .xlsx, .xls, .csv

2. **Configure Processing**
   - Select columns to process
   - Choose data transformations
   - Set up templates if needed

3. **Process Data**
   - Review data preview
   - Apply transformations
   - Download processed file

4. **Save Presets**
   - Save your configuration as a preset
   - Reuse settings for similar files

## Cost Considerations

### Vercel Free Tier
- ✅ 100GB bandwidth/month
- ✅ 100 serverless function executions/day
- ✅ Automatic deployments
- ✅ Custom domains
- ❌ No server-side file storage (files processed client-side)

### Data Processing
- All file processing happens in the browser
- No server costs for data transformation
- Minimal bandwidth usage for file uploads/downloads

## Troubleshooting

### Build Issues
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

### Performance Issues
- Large files (>10MB) may take longer to process
- Consider splitting very large datasets
- Use CSV format for better performance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details 