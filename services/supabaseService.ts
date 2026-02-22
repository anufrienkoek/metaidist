import { createClient } from '@supabase/supabase-js';
import { Program } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// --- Data Mapping ---

// Map DB row to Program type
const mapRowToProgram = (row: any): Program => {
    return {
        ...row.content, // Spread the JSON content
        id: row.id,     // Ensure ID comes from DB
        updatedAt: row.updated_at,
        createdAt: row.created_at,
        author: row.user_id // Or fetch user metadata if needed
    };
};

// --- Services ---

export const programService = {
    async getAll() {
        if (!supabase) return [];
        
        const { data, error } = await supabase
            .from('programs')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return data.map(mapRowToProgram);
    },

    async save(program: Program) {
        if (!supabase) return null;

        const { id, createdAt, updatedAt, author, ...content } = program;
        
        // Check if exists to decide insert vs update
        // Note: In a real app, we might use upsert if ID is consistent
        // But here we need to handle the user_id context.
        
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) throw new Error("User not authenticated");

        // Prepare payload
        const payload = {
            id: program.id,
            user_id: user.id,
            name: program.name,
            content: content, // Store the complex object in JSONB
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('programs')
            .upsert(payload)
            .select()
            .single();

        if (error) throw error;
        return mapRowToProgram(data);
    },

    async delete(id: string) {
        if (!supabase) return;
        const { error } = await supabase.from('programs').delete().match({ id });
        if (error) throw error;
    },

    async logGeneration(
        programId: string,
        modelName: string,
        stats: { total: number; prompt: number; completion: number },
        inputParams: any,
        outputSections: any
    ) {
        if (!supabase) return;

        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return; // Can't log if not authenticated

        const { error } = await supabase.from('generation_logs').insert({
            user_id: user.id,
            program_id: programId,
            model_name: modelName,
            tokens_total: stats.total,
            prompt_tokens: stats.prompt,
            completion_tokens: stats.completion,
            input_params: inputParams,
            output_sections: outputSections
        });

        if (error) {
            console.error("Failed to log generation:", error);
            // Don't throw, logging failure shouldn't stop the app
        }
    },

    async getUserUsage() {
        if (!supabase) return { programsCount: 0, tokensUsed: 0 };
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return { programsCount: 0, tokensUsed: 0 };

        // Fetch all programs content to sum tokens
        const { data: programs, error } = await supabase
            .from('programs')
            .select('content')
            .eq('user_id', user.id);
        
        if (error) {
            console.error("Error fetching usage stats:", error);
            return { programsCount: 0, tokensUsed: 0 };
        }

        const programsCount = programs?.length || 0;
        
        const tokensUsed = programs?.reduce((sum, row) => {
            const content = row.content as any;
            const tokens = content?.stats?.totalTokens || 0;
            return sum + tokens;
        }, 0) || 0;

        return {
            programsCount,
            tokensUsed
        };
    }
};
