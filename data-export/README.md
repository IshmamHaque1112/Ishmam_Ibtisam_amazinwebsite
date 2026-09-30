# Data Files for Supabase Import

These CSV files are ready for import into your Supabase database.

## Files Available:
- **customers.csv** - Customer accounts with generated passwords
- **products.csv** - Product catalog data  
- **sellers.csv** - Seller profile data
- **seller_blurbs.csv** - Seller descriptions

## Import Order:
1. Import sellers.csv first
2. Import seller_blurbs.csv (updates existing sellers)
3. Import products.csv (references sellers)
4. Import customers.csv

## Database Schema Reference:
See SUPABASE_DATASETS.md in the main project directory for complete schema and import instructions.