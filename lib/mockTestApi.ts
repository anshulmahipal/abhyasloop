/**
 * Mock Test API Client
 * 
 * Client functions for interacting with the Mock Test Generator system
 */

import { supabase } from './supabase';

export interface MockTest {
  id: string;
  title: string;
  slug: string;
  exam_type: string;
  status: 'BUILDING' | 'READY' | 'FAILED';
  created_at: string;
  updated_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface TestSection {
  id: string;
  mock_test_id: string;
  subject_name: string;
  topic_name: string;
  question_count: number;
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface MockTestQuestion {
  id: string;
  section_id: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
  order_index: number;
  created_at: string;
}

export interface MockTestWithDetails extends MockTest {
  sections: (TestSection & {
    questions: MockTestQuestion[];
  })[];
}

/**
 * Generate a new mock test
 */
export async function generateMockTest(
  examType: string,
  title?: string
): Promise<MockTest> {
  const { data, error } = await supabase.functions.invoke('generate-mock-test', {
    body: { examType, title },
  });

  if (error) {
    throw new Error(`Failed to generate mock test: ${error.message}`);
  }

  return data.mockTest;
}

/**
 * Get mock test by ID
 */
export async function getMockTest(id: string): Promise<MockTest | null> {
  const { data, error } = await supabase
    .from('mock_tests')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching mock test:', error);
    return null;
  }

  return data as MockTest;
}

/**
 * Get mock test by slug
 */
export async function getMockTestBySlug(slug: string): Promise<MockTest | null> {
  const { data, error } = await supabase
    .from('mock_tests')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('Error fetching mock test:', error);
    return null;
  }

  return data as MockTest;
}

/**
 * Get mock test with all sections and questions
 */
export async function getMockTestWithDetails(
  id: string
): Promise<MockTestWithDetails | null> {
  // Fetch mock test
  const { data: mockTest, error: mockTestError } = await supabase
    .from('mock_tests')
    .select('*')
    .eq('id', id)
    .single();

  if (mockTestError || !mockTest) {
    console.error('Error fetching mock test:', mockTestError);
    return null;
  }

  // Fetch sections
  const { data: sections, error: sectionsError } = await supabase
    .from('test_sections')
    .select('*')
    .eq('mock_test_id', id)
    .order('order_index');

  if (sectionsError) {
    console.error('Error fetching sections:', sectionsError);
    return null;
  }

  // Fetch questions for each section
  const sectionsWithQuestions = await Promise.all(
    (sections || []).map(async (section) => {
      const { data: questions, error: questionsError } = await supabase
        .from('mock_test_questions')
        .select('*')
        .eq('section_id', section.id)
        .order('order_index');

      if (questionsError) {
        console.error(`Error fetching questions for section ${section.id}:`, questionsError);
        return { ...section, questions: [] };
      }

      return {
        ...section,
        questions: (questions || []) as MockTestQuestion[],
      };
    })
  );

  return {
    ...(mockTest as MockTest),
    sections: sectionsWithQuestions,
  };
}

/**
 * Get all mock tests (with optional filters)
 */
export async function getAllMockTests(filters?: {
  examType?: string;
  status?: 'BUILDING' | 'READY' | 'FAILED';
  limit?: number;
}): Promise<MockTest[]> {
  let query = supabase.from('mock_tests').select('*').order('created_at', { ascending: false });

  if (filters?.examType) {
    query = query.eq('exam_type', filters.examType);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching mock tests:', error);
    return [];
  }

  return (data || []) as MockTest[];
}

/**
 * Check if mock test is ready
 */
export async function isMockTestReady(id: string): Promise<boolean> {
  const mockTest = await getMockTest(id);
  return mockTest?.status === 'READY';
}

/**
 * Poll mock test status until ready (with timeout)
 */
export async function waitForMockTestReady(
  id: string,
  timeoutMs: number = 60000,
  pollIntervalMs: number = 2000
): Promise<MockTest> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const mockTest = await getMockTest(id);

    if (!mockTest) {
      throw new Error('Mock test not found');
    }

    if (mockTest.status === 'READY') {
      return mockTest;
    }

    if (mockTest.status === 'FAILED') {
      throw new Error(`Mock test generation failed: ${mockTest.error_message || 'Unknown error'}`);
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error('Timeout waiting for mock test to be ready');
}
