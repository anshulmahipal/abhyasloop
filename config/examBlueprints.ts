/**
 * Exam Blueprints Configuration
 * 
 * Defines the structure of different exam types for the Mock Test Generator.
 * Each blueprint specifies sections with subject, topic, and question count.
 */

export interface BlueprintSection {
  subject: string;
  topic: string;
  count: number;
}

export interface ExamBlueprint {
  title: string;
  sections: BlueprintSection[];
}

export const EXAM_BLUEPRINTS: Record<string, ExamBlueprint> = {
  UPSC_PRELIMS_MINI: {
    title: "UPSC Prelims Mini Mock",
    sections: [
      { subject: "History", topic: "Indian Freedom Struggle", count: 5 },
      { subject: "English", topic: "Reading Comprehension", count: 5 },
    ],
  },

  UPSC_PRELIMS_FULL: {
    title: "UPSC Prelims Full Mock",
    sections: [
      { subject: "History", topic: "Ancient History", count: 10 },
      { subject: "History", topic: "Medieval History", count: 10 },
      { subject: "History", topic: "Modern History", count: 15 },
      { subject: "History", topic: "Indian Freedom Struggle", count: 15 },
      { subject: "Geography", topic: "Indian Geography", count: 10 },
      { subject: "Geography", topic: "World Geography", count: 10 },
      { subject: "Polity", topic: "Constitution of India", count: 15 },
      { subject: "Economics", topic: "Indian Economy", count: 10 },
      { subject: "Science", topic: "Physics", count: 10 },
      { subject: "Science", topic: "Chemistry", count: 10 },
      { subject: "Science", topic: "Biology", count: 10 },
      { subject: "Current Affairs", topic: "National Events", count: 10 },
      { subject: "Current Affairs", topic: "International Events", count: 10 },
    ],
  },

  SSC_CGL_MINI: {
    title: "SSC CGL Mini Mock",
    sections: [
      { subject: "Quant", topic: "Arithmetic", count: 5 },
      { subject: "Reasoning", topic: "General Intelligence", count: 5 },
    ],
  },

  SSC_CGL_FULL: {
    title: "SSC CGL Full Mock",
    sections: [
      { subject: "Quant", topic: "Arithmetic", count: 15 },
      { subject: "Quant", topic: "Algebra", count: 10 },
      { subject: "Quant", topic: "Geometry", count: 10 },
      { subject: "Quant", topic: "Trigonometry", count: 5 },
      { subject: "Reasoning", topic: "General Intelligence", count: 20 },
      { subject: "English", topic: "Grammar", count: 15 },
      { subject: "English", topic: "Vocabulary", count: 10 },
      { subject: "English", topic: "Reading Comprehension", count: 10 },
      { subject: "General Awareness", topic: "History", count: 10 },
      { subject: "General Awareness", topic: "Geography", count: 10 },
      { subject: "General Awareness", topic: "Science", count: 10 },
      { subject: "General Awareness", topic: "Current Affairs", count: 10 },
    ],
  },

  JEE_MAIN_MINI: {
    title: "JEE Main Mini Mock",
    sections: [
      { subject: "Physics", topic: "Mechanics", count: 5 },
      { subject: "Chemistry", topic: "Organic Chemistry", count: 5 },
      { subject: "Math", topic: "Calculus", count: 5 },
    ],
  },

  JEE_MAIN_FULL: {
    title: "JEE Main Full Mock",
    sections: [
      { subject: "Physics", topic: "Mechanics", count: 10 },
      { subject: "Physics", topic: "Thermodynamics", count: 5 },
      { subject: "Physics", topic: "Electromagnetism", count: 10 },
      { subject: "Physics", topic: "Optics", count: 5 },
      { subject: "Physics", topic: "Modern Physics", count: 5 },
      { subject: "Chemistry", topic: "Physical Chemistry", count: 10 },
      { subject: "Chemistry", topic: "Organic Chemistry", count: 15 },
      { subject: "Chemistry", topic: "Inorganic Chemistry", count: 10 },
      { subject: "Math", topic: "Algebra", count: 10 },
      { subject: "Math", topic: "Calculus", count: 15 },
      { subject: "Math", topic: "Coordinate Geometry", count: 10 },
      { subject: "Math", topic: "Trigonometry", count: 5 },
    ],
  },

  NEET_MINI: {
    title: "NEET Mini Mock",
    sections: [
      { subject: "Physics", topic: "Mechanics", count: 5 },
      { subject: "Chemistry", topic: "Organic Chemistry", count: 5 },
      { subject: "Biology", topic: "Botany", count: 5 },
      { subject: "Biology", topic: "Zoology", count: 5 },
    ],
  },

  NEET_FULL: {
    title: "NEET Full Mock",
    sections: [
      { subject: "Physics", topic: "Mechanics", count: 15 },
      { subject: "Physics", topic: "Thermodynamics", count: 10 },
      { subject: "Physics", topic: "Electromagnetism", count: 10 },
      { subject: "Physics", topic: "Optics", count: 10 },
      { subject: "Physics", topic: "Modern Physics", count: 5 },
      { subject: "Chemistry", topic: "Physical Chemistry", count: 15 },
      { subject: "Chemistry", topic: "Organic Chemistry", count: 20 },
      { subject: "Chemistry", topic: "Inorganic Chemistry", count: 15 },
      { subject: "Biology", topic: "Botany - Plant Physiology", count: 20 },
      { subject: "Biology", topic: "Botany - Plant Kingdom", count: 10 },
      { subject: "Biology", topic: "Zoology - Human Physiology", count: 25 },
      { subject: "Biology", topic: "Zoology - Animal Kingdom", count: 10 },
      { subject: "Biology", topic: "Genetics and Evolution", count: 15 },
    ],
  },
};

/**
 * Get blueprint by exam type key
 */
export function getBlueprint(examType: string): ExamBlueprint | null {
  return EXAM_BLUEPRINTS[examType] || null;
}

/**
 * Get all available exam types
 */
export function getAvailableExamTypes(): string[] {
  return Object.keys(EXAM_BLUEPRINTS);
}

/**
 * Validate blueprint structure
 */
export function validateBlueprint(blueprint: ExamBlueprint): boolean {
  if (!blueprint.title || !blueprint.sections || blueprint.sections.length === 0) {
    return false;
  }

  return blueprint.sections.every(
    (section) =>
      section.subject &&
      section.topic &&
      section.count > 0 &&
      typeof section.count === 'number'
  );
}
