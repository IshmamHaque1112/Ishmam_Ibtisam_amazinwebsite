import { supabase } from '../lib/supabase';
import { Customer, Product, ProductSearch, Seller, TagWithCount } from '../types';

// Supabase database implementation replacing sql.js

export class SupabaseDatabase {
  // Product queries
  async getProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('product_name');
    
    if (error) throw error;
    return (data || []).map(this.toProduct);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('product_id', id)
      .single();
    
    if (error) return undefined;
    return this.toProduct(data);
  }

  async getProductsBySeller(sellerId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('seller_id', sellerId)
      .order('product_name');
    
    if (error) throw error;
    return (data || []).map(this.toProduct);
  }

  async searchProducts(search: ProductSearch): Promise<Product[]> {
    let query = supabase.from('products').select('*');

    if (search.text) {
      query = query.or(`product_name.ilike.%${search.text}%,category.ilike.%${search.text}%,seller_name.ilike.%${search.text}%`);
    }
    if (search.minPrice !== undefined) {
      query = query.gte('current_price', search.minPrice);
    }
    if (search.maxPrice !== undefined) {
      query = query.lte('current_price', search.maxPrice);
    }
    if (search.category) {
      query = query.eq('category', search.category);
    }
    if (search.sellerId) {
      query = query.eq('seller_id', search.sellerId);
    }

    const { data, error } = await query.order('product_name');
    if (error) throw error;
    return (data || []).map(this.toProduct);
  }

  async getCategories(): Promise<string[]> {
    const { data, error } = await supabase
      .from('products')
      .select('category')
      .order('category');
    
    if (error) throw error;
    const categories = (data || []).map((d: any) => d.category as string);
    return [...new Set(categories)];
  }

  // Seller queries
  async getSellers(): Promise<Seller[]> {
    const { data, error } = await supabase
      .from('sellers')
      .select('*')
      .order('seller_name');
    
    if (error) throw error;
    return (data || []).map(this.toSeller);
  }

  async getSeller(id: string): Promise<Seller | undefined> {
    const { data, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('seller_id', id)
      .single();
    
    if (error) return undefined;
    return this.toSeller(data);
  }

  async getSellerProductCounts(): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from('products')
      .select('seller_id');
    
    if (error) throw error;
    
    const counts: Record<string, number> = {};
    (data || []).forEach((p: any) => {
      counts[p.seller_id] = (counts[p.seller_id] || 0) + 1;
    });
    return counts;
  }

  // Customer queries
  async findCustomer(username: string): Promise<Customer | undefined> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .ilike('username', username)
      .single();
    
    if (error) return undefined;
    return this.toCustomer(data);
  }

  async registerCustomer(username: string, displayName: string): Promise<{ customer?: Customer; error?: string }> {
    const name = username.trim().toLowerCase();
    const display = displayName.trim().slice(0, 60);
    
    // Check if username exists
    const existing = await this.findCustomer(name);
    if (existing) {
      return { error: 'That username is already taken.' };
    }

    // Generate password
    const password = this.generatePassword();
    
    // Get count for ID generation
    const { count } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });
    
    const id = `C${String((count || 0) + 1).padStart(3, '0')}`;
    const joinDate = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('customers')
      .insert({
        customer_id: id,
        username: name,
        display_name: display,
        join_date: joinDate,
        account_type: 'New',
        favorite_category: null,
        avg_cart_size: 0,
        has_left_seller_ratings: 0,
        password: password
      })
      .select()
      .single();

    if (error) return { error: error.message };
    return { customer: this.toCustomer(data) };
  }

  // Additional methods for reviews, tags, etc. (placeholders for now)
  async getProductReviews(productId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('product_reviews')
      .select('*')
      .eq('product_id', productId);
    
    if (error) return [];
    return data || [];
  }

  async getProductTags(productId: string): Promise<TagWithCount[]> {
    const { data, error } = await supabase
      .from('product_tags')
      .select('*')
      .eq('product_id', productId);
    
    if (error) return [];
    return (data || []).map((t: any) => ({ tagName: t.tag_name, count: t.count || 1 }));
  }

  async getProductPriceHistory(productId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .eq('product_id', productId);
    
    if (error) return [];
    return data || [];
  }

  async getSellerReviews(sellerId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('seller_reviews')
      .select('*')
      .eq('seller_id', sellerId);
    
    if (error) return [];
    return data || [];
  }

  async getSellerTags(sellerId: string): Promise<TagWithCount[]> {
    const { data, error } = await supabase
      .from('seller_tags')
      .select('*')
      .eq('seller_id', sellerId);
    
    if (error) return [];
    return (data || []).map((t: any) => ({ tagName: t.tag_name, count: t.count || 1 }));
  }

  async getSellerReviewAverage(sellerId: string): Promise<number | null> {
    const { data, error } = await supabase
      .from('seller_reviews')
      .select('rating')
      .eq('seller_id', sellerId);
    
    if (error || !data || data.length === 0) return null;
    const sum = data.reduce((acc: number, r: any) => acc + r.rating, 0);
    return sum / data.length;
  }

  // Write operations
  async addProductReview(review: any): Promise<void> {
    const { error } = await supabase
      .from('product_reviews')
      .insert(review);
    if (error) throw error;
  }

  async addProductTag(tag: any): Promise<void> {
    const { error } = await supabase
      .from('product_tags')
      .insert(tag);
    if (error) throw error;
  }

  async addSellerReview(review: any): Promise<void> {
    const { error } = await supabase
      .from('seller_reviews')
      .insert(review);
    if (error) throw error;
  }

  async addSellerTag(tag: any): Promise<void> {
    const { error } = await supabase
      .from('seller_tags')
      .insert(tag);
    if (error) throw error;
  }

  // Helper methods
  private toProduct(data: any): Product {
    return {
      id: data.product_id,
      name: data.product_name,
      category: data.category,
      currentPrice: data.current_price,
      allTimeLowPrice: data.all_time_low_price,
      thirtyDayHighPrice: data.thirty_day_high_price,
      storeRecommended: data.store_recommended === 1,
      rating: data.product_rating,
      sellerId: data.seller_id,
      sellerName: data.seller_name
    };
  }

  private toSeller(data: any): Seller {
    return {
      id: data.seller_id,
      name: data.seller_name,
      returnPolicy: data.return_policy,
      sourceOfSupply: data.source_of_supply,
      yearsActive: data.years_active,
      priceRating: data.price_rating,
      qualityRating: data.quality_rating,
      deliveryTimeRating: data.delivery_time_rating,
      overallRating: data.overall_rating,
      priceLockEligible: data.price_lock_eligible === 1,
      blurb: data.blurb
    };
  }

  private toCustomer(data: any): Customer {
    return {
      id: data.customer_id,
      username: data.username,
      displayName: data.display_name,
      joinDate: data.join_date,
      accountType: data.account_type,
      favoriteCategory: data.favorite_category,
      password: data.password
    };
  }

  private generatePassword(): string {
    const length = Math.floor(Math.random() * 6) + 10; // 10-15 characters
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}

// Create new instance each time to avoid caching issues
export const getSupabaseDatabase = (): SupabaseDatabase => {
  return new SupabaseDatabase();
};