import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { useMutation } from '@apollo/client';

import { RootState } from '@/store';
import { SUBMIT_ASSESSMENT_RESPONSE } from '@/services/graphql/mutations';
import { updateAssessmentProgress } from '@/store/slices/assessmentsSlice';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ProgressIndicator } from '@/components/ui/ProgressIndicator';
import { QuestionCard } from '@/components/assessment/QuestionCard';
import { ResponseInput } from '@/components/assessment/ResponseInput';
import { ConfidenceSlider } from '@/components/assessment/ConfidenceSlider';

const { width } = Dimensions.get('window');

interface RouteParams {
  id: string;
  currentSection?: number;
}

interface Question {
  id: string;
  text: string;
  type: 'multiple_choice' | 'scale' | 'text' | 'boolean' | 'matrix';
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  required: boolean;
  helpText?: string;
  dimension: string;
}

interface QuestionSection {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}

// Mock data - in a real app, this would come from the API
const mockSections: QuestionSection[] = [
  {
    id: 'operations',
    title: 'Operations & Processes',
    description: 'Assess your operational efficiency and process maturity',
    questions: [
      {
        id: 'ops_1',
        text: 'How standardized are your core business processes?',
        type: 'scale',
        scaleMin: 1,
        scaleMax: 5,
        required: true,
        helpText: '1 = Ad-hoc, 5 = Fully standardized and documented',
        dimension: 'operations',
      },
      {
        id: 'ops_2',
        text: 'What percentage of your processes are automated?',
        type: 'multiple_choice',
        options: ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'],
        required: true,
        dimension: 'operations',
      },
    ],
  },
  {
    id: 'technology',
    title: 'Technology & Systems',
    description: 'Evaluate your technology infrastructure and digital capabilities',
    questions: [
      {
        id: 'tech_1',
        text: 'How would you rate your current technology stack?',
        type: 'scale',
        scaleMin: 1,
        scaleMax: 5,
        required: true,
        helpText: '1 = Legacy systems, 5 = Modern, integrated technology',
        dimension: 'technology',
      },
    ],
  },
];

export function QuestionFlowScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();

  const { id, currentSection = 0 } = (route.params as RouteParams) || {};

  const [sectionIndex, setSectionIndex] = useState(currentSection);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [confidences, setConfidences] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const panX = useRef(new Animated.Value(0)).current;
  const cardTranslateX = useRef(new Animated.Value(0)).current;

  const [submitResponse] = useMutation(SUBMIT_ASSESSMENT_RESPONSE);

  const currentSection = mockSections[sectionIndex];
  const currentQuestion = currentSection?.questions[questionIndex];
  const totalQuestions = mockSections.reduce((sum, section) => sum + section.questions.length, 0);
  const completedQuestions = mockSections
    .slice(0, sectionIndex)
    .reduce((sum, section) => sum + section.questions.length, 0) + questionIndex;

  const progress = totalQuestions > 0 ? completedQuestions / totalQuestions : 0;

  const handleResponse = (questionId: string, response: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: response,
    }));
  };

  const handleConfidence = (questionId: string, confidence: number) => {
    setConfidences(prev => ({
      ...prev,
      [questionId]: confidence,
    }));
  };

  const submitCurrentResponse = async () => {
    if (!currentQuestion) return;

    const response = responses[currentQuestion.id];
    const confidence = confidences[currentQuestion.id] || 0.8;

    if (currentQuestion.required && !response) {
      Alert.alert('Required Field', 'Please provide an answer before continuing.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitResponse({
        variables: {
          input: {
            assessmentId: id,
            questionId: currentQuestion.id,
            response,
            confidence,
          },
        },
      });

      // Update local progress
      dispatch(updateAssessmentProgress({
        assessmentId: id,
        progress: (completedQuestions + 1) / totalQuestions,
      }));
    } catch (error) {
      console.error('Submit error:', error);
      // Continue anyway for demo purposes
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToNext = async () => {
    await submitCurrentResponse();

    if (questionIndex < currentSection.questions.length - 1) {
      // Next question in current section
      setQuestionIndex(prev => prev + 1);
    } else if (sectionIndex < mockSections.length - 1) {
      // Next section
      setSectionIndex(prev => prev + 1);
      setQuestionIndex(0);
    } else {
      // Assessment complete
      handleComplete();
    }
  };

  const goToPrevious = () => {
    if (questionIndex > 0) {
      // Previous question in current section
      setQuestionIndex(prev => prev - 1);
    } else if (sectionIndex > 0) {
      // Previous section (last question)
      const prevSection = mockSections[sectionIndex - 1];
      setSectionIndex(prev => prev - 1);
      setQuestionIndex(prevSection.questions.length - 1);
    }
  };

  const handleComplete = () => {
    Alert.alert(
      'Assessment Complete',
      'Thank you for completing the assessment! Your responses are being processed.',
      [
        {
          text: 'View Results',
          onPress: () => {
            navigation.navigate('AssessmentDetail' as never, {
              id,
            } as never);
          },
        },
      ]
    );
  };

  const handleSwipeGesture = (event: PanGestureHandlerGestureEvent) => {
    const { translationX } = event.nativeEvent;
    
    if (translationX > 50) {
      // Swipe right - previous
      goToPrevious();
    } else if (translationX < -50) {
      // Swipe left - next
      goToNext();
    }
  };

  const canGoNext = () => {
    if (!currentQuestion) return false;
    if (currentQuestion.required && !responses[currentQuestion.id]) return false;
    return !isSubmitting;
  };

  const canGoPrevious = () => {
    return sectionIndex > 0 || questionIndex > 0;
  };

  const isLastQuestion = () => {
    return sectionIndex === mockSections.length - 1 && 
           questionIndex === currentSection.questions.length - 1;
  };

  if (!currentSection || !currentQuestion) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <Text style={styles.loadingText}>Loading questions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#0D1B2A', '#1B263B']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.sectionTitle}>{currentSection.title}</Text>
            <Text style={styles.questionCounter}>
              Question {questionIndex + 1} of {currentSection.questions.length}
            </Text>
          </View>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        <ProgressIndicator 
          progress={progress}
          style={styles.progressBar}
        />
      </LinearGradient>

      {/* Question Content */}
      <PanGestureHandler onGestureEvent={handleSwipeGesture}>
        <Animated.View style={styles.questionContainer}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <QuestionCard question={currentQuestion} style={styles.questionCard}>
              <ResponseInput
                question={currentQuestion}
                value={responses[currentQuestion.id]}
                onResponse={(response) => handleResponse(currentQuestion.id, response)}
                style={styles.responseInput}
              />
              
              <ConfidenceSlider
                value={confidences[currentQuestion.id] || 0.8}
                onValueChange={(confidence) => handleConfidence(currentQuestion.id, confidence)}
                style={styles.confidenceSlider}
              />
            </QuestionCard>
          </ScrollView>
        </Animated.View>
      </PanGestureHandler>

      {/* Navigation Controls */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[styles.navButton, !canGoPrevious() && styles.navButtonDisabled]}
          onPress={goToPrevious}
          disabled={!canGoPrevious()}
        >
          <Ionicons name="chevron-back" size={20} color={canGoPrevious() ? "#3B82F6" : "#9CA3AF"} />
          <Text style={[styles.navButtonText, !canGoPrevious() && styles.navButtonTextDisabled]}>
            Previous
          </Text>
        </TouchableOpacity>

        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            {Math.round(progress * 100)}% Complete
          </Text>
          <View style={styles.progressDots}>
            {mockSections.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index === sectionIndex && styles.progressDotActive,
                  index < sectionIndex && styles.progressDotCompleted,
                ]}
              />
            ))}
          </View>
        </View>

        <Button
          title={isLastQuestion() ? 'Complete' : 'Next'}
          onPress={goToNext}
          disabled={!canGoNext()}
          loading={isSubmitting}
          style={styles.nextButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  questionCounter: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    marginHorizontal: 16,
  },
  questionContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  questionCard: {
    minHeight: 400,
  },
  responseInput: {
    marginTop: 24,
  },
  confidenceSlider: {
    marginTop: 32,
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
    marginLeft: 4,
  },
  navButtonTextDisabled: {
    color: '#9CA3AF',
  },
  progressInfo: {
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 4,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  progressDotActive: {
    backgroundColor: '#3B82F6',
  },
  progressDotCompleted: {
    backgroundColor: '#10B981',
  },
  nextButton: {
    minWidth: 80,
  },
});