/**
 * Test script to verify Firecrawl works with ClinicalTrials.gov
 * 
 * This script:
 * 1. Fetches a trial from ClinicalTrials.gov API (structured data)
 * 2. Uses Firecrawl to scrape the same trial page (enriched data)
 * 3. Saves results to files for inspection
 * 
 * Run: node test-firecrawl.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Firecrawl = require('@mendable/firecrawl-js').default;

// Initialize Firecrawl (v4 API)
const firecrawl = new Firecrawl({ 
  apiKey: process.env.FIRECRAWL_API_KEY 
});

// ClinicalTrials.gov API v2 base URL
const CLINICALTRIALS_API = 'https://clinicaltrials.gov/api/v2/studies';

// Output directory
const OUTPUT_DIR = path.join(__dirname, 'test-output');

/**
 * Step 1: Fetch trial data from official ClinicalTrials.gov API
 */
async function fetchFromAPI(condition = 'multiple sclerosis', limit = 3) {
  console.log('\n📡 Fetching from ClinicalTrials.gov API...\n');
  
  const params = new URLSearchParams({
    'query.cond': condition,
    'filter.overallStatus': 'RECRUITING',
    'pageSize': limit.toString(),
  });
  
  const response = await fetch(`${CLINICALTRIALS_API}?${params}`);
  const data = await response.json();
  
  console.log(`Found ${data.studies?.length || 0} recruiting trials for "${condition}"\n`);
  
  // Extract key info from first trial
  if (data.studies && data.studies.length > 0) {
    const trial = data.studies[0];
    const id = trial.protocolSection?.identificationModule;
    const status = trial.protocolSection?.statusModule;
    const eligibility = trial.protocolSection?.eligibilityModule;
    const contacts = trial.protocolSection?.contactsLocationsModule;
    
    console.log('=== TRIAL FROM API ===');
    console.log(`NCT ID: ${id?.nctId}`);
    console.log(`Title: ${id?.briefTitle}`);
    console.log(`Status: ${status?.overallStatus}`);
    console.log(`Phase: ${trial.protocolSection?.designModule?.phases?.join(', ') || 'N/A'}`);
    console.log(`\nEligibility Criteria (first 500 chars):`);
    console.log(eligibility?.eligibilityCriteria?.substring(0, 500) + '...');
    console.log(`\nLocations: ${contacts?.locations?.length || 0} sites`);
    
    return {
      nctId: id?.nctId,
      title: id?.briefTitle,
      url: `https://clinicaltrials.gov/study/${id?.nctId}`,
      apiData: trial
    };
  }
  
  return null;
}

/**
 * Step 2: Scrape the same trial page with Firecrawl
 */
async function scrapeWithFirecrawl(url) {
  console.log('\n\n🔥 Scraping with Firecrawl...\n');
  console.log(`URL: ${url}\n`);
  
  try {
    // v4 API uses .scrape() not .scrapeUrl()
    const result = await firecrawl.scrape(url, {
      formats: ['markdown'],
    });
    
    console.log('=== FIRECRAWL RESULT ===');
    console.log(`Success: ${result.success}`);
    console.log(`Title: ${result.metadata?.title || 'N/A'}`);
    console.log(`\nMarkdown content (first 1000 chars):`);
    console.log(result.markdown?.substring(0, 1000) + '...');
    
    return result;
  } catch (error) {
    console.error('Firecrawl error:', error.message);
    return null;
  }
}

/**
 * Step 3: Test Firecrawl's extract feature for structured data
 */
async function extractStructuredData(url) {
  console.log('\n\n🔍 Testing Firecrawl Extract (structured data)...\n');
  
  try {
    // v4 API uses .scrape() with extract format
    const result = await firecrawl.scrape(url, {
      formats: ['extract'],
      extract: {
        prompt: 'Extract the clinical trial information including: trial ID, title, phase, status, sponsor, eligibility criteria (inclusion and exclusion separately), and study locations.',
        schema: {
          type: 'object',
          properties: {
            trialId: { type: 'string' },
            title: { type: 'string' },
            phase: { type: 'string' },
            status: { type: 'string' },
            sponsor: { type: 'string' },
            inclusion: { type: 'array', items: { type: 'string' } },
            exclusion: { type: 'array', items: { type: 'string' } },
            locations: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    });
    
    console.log('=== FIRECRAWL EXTRACT RESULT ===');
    console.log(JSON.stringify(result.extract, null, 2));
    
    return result;
  } catch (error) {
    console.error('Firecrawl extract error:', error.message);
    return null;
  }
}

/**
 * Generate a clean markdown file from API data (our preferred format)
 */
function generateCleanMarkdown(apiData) {
  const trial = apiData.protocolSection;
  const id = trial?.identificationModule;
  const status = trial?.statusModule;
  const design = trial?.designModule;
  const eligibility = trial?.eligibilityModule;
  const contacts = trial?.contactsLocationsModule;
  const description = trial?.descriptionModule;
  
  // Extract locations
  const locations = contacts?.locations || [];
  const locationList = locations.map(loc => 
    `- ${loc.city}, ${loc.state || ''} ${loc.country} - ${loc.facility || 'N/A'}`
  ).join('\n') || '- No locations listed';
  
  // Extract contacts
  const centralContacts = contacts?.centralContacts || [];
  const contactList = centralContacts.map(c => 
    `- ${c.name} (${c.role}): ${c.email || 'N/A'}, ${c.phone || 'N/A'}`
  ).join('\n') || '- No central contacts listed';

  return `# Trial: ${id?.nctId}

## Basic Info
- **Title:** ${id?.briefTitle}
- **Official Title:** ${id?.officialTitle || 'N/A'}
- **Phase:** ${design?.phases?.join(', ') || 'N/A'}
- **Status:** ${status?.overallStatus}
- **Study Type:** ${design?.studyType || 'N/A'}
- **Sponsor:** ${trial?.sponsorCollaboratorsModule?.leadSponsor?.name || 'N/A'}

## Description
${description?.briefSummary || 'No description available.'}

## Eligibility Criteria

${eligibility?.eligibilityCriteria || 'No eligibility criteria specified.'}

### Key Requirements
- **Minimum Age:** ${eligibility?.minimumAge || 'N/A'}
- **Maximum Age:** ${eligibility?.maximumAge || 'N/A'}
- **Sex:** ${eligibility?.sex || 'All'}
- **Healthy Volunteers:** ${eligibility?.healthyVolunteers ? 'Yes' : 'No'}

## Locations
${locationList}

## Contacts
${contactList}

## Dates
- **Start Date:** ${status?.startDateStruct?.date || 'N/A'}
- **Completion Date:** ${status?.completionDateStruct?.date || 'N/A'}
- **Last Updated:** ${status?.lastUpdateSubmitDate || 'N/A'}

## Source
- **ClinicalTrials.gov:** https://clinicaltrials.gov/study/${id?.nctId}
- **NCT ID:** ${id?.nctId}
`;
}

/**
 * Main test function
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Firecrawl + ClinicalTrials.gov Integration Test           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  // Check for API key
  if (!process.env.FIRECRAWL_API_KEY) {
    console.error('\n❌ Error: FIRECRAWL_API_KEY not set in .env file');
    console.log('Create a .env file with: FIRECRAWL_API_KEY=fc-your-key');
    process.exit(1);
  }
  
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Step 1: Get trial from API
  const trial = await fetchFromAPI('multiple sclerosis', 1);
  
  if (!trial) {
    console.error('No trials found from API');
    process.exit(1);
  }
  
  // Save raw API response
  const apiOutputPath = path.join(OUTPUT_DIR, `${trial.nctId}_api_raw.json`);
  fs.writeFileSync(apiOutputPath, JSON.stringify(trial.apiData, null, 2));
  console.log(`\n📁 Saved API response to: ${apiOutputPath}`);
  
  // Generate and save clean markdown from API data
  const cleanMarkdown = generateCleanMarkdown(trial.apiData);
  const cleanMdPath = path.join(OUTPUT_DIR, `${trial.nctId}_clean.md`);
  fs.writeFileSync(cleanMdPath, cleanMarkdown);
  console.log(`📁 Saved clean markdown to: ${cleanMdPath}`);
  
  // Step 2: Scrape with Firecrawl (markdown)
  const scraped = await scrapeWithFirecrawl(trial.url);
  
  if (scraped && scraped.markdown) {
    const firecrawlMdPath = path.join(OUTPUT_DIR, `${trial.nctId}_firecrawl.md`);
    fs.writeFileSync(firecrawlMdPath, scraped.markdown);
    console.log(`📁 Saved Firecrawl markdown to: ${firecrawlMdPath}`);
  }
  
  // Step 3: Extract structured data with Firecrawl (skip for now due to API issue)
  // const extracted = await extractStructuredData(trial.url);
  
  // Summary
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  FILES GENERATED - Please review in test-output/           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n📂 Output directory: ${OUTPUT_DIR}\n`);
  console.log('Files created:');
  console.log(`  1. ${trial.nctId}_api_raw.json    - Raw API response (for reference)`);
  console.log(`  2. ${trial.nctId}_clean.md        - Our generated markdown (RECOMMENDED)`);
  console.log(`  3. ${trial.nctId}_firecrawl.md    - Firecrawl scraped markdown\n`);
  console.log('👉 Compare _clean.md vs _firecrawl.md to see which format is better');
  console.log('   for our agent to read and match patients against.\n');
}

main().catch(console.error);
