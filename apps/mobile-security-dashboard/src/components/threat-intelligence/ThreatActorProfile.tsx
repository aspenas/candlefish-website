import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Card, Badge, Icon, Button, Avatar, ListItem } from 'react-native-elements';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';

import {
  ThreatActor,
  SophisticationLevel,
  ThreatMotivation,
  ResourceLevel,
  KillChainPhase,
  IntendedEffect,
  IndustrySector,
  ThreatIndicator,
  ThreatCampaign,
  MalwareTool,
  AttackTechnique,
} from '../../types/security';

interface ThreatActorProfileProps {
  actor: ThreatActor;
  onIndicatorPress?: (indicator: ThreatIndicator) => void;
  onCampaignPress?: (campaign: ThreatCampaign) => void;
  onToolPress?: (tool: MalwareTool) => void;
  onTechniquePress?: (technique: AttackTechnique) => void;
  onToggleTracking?: (actorId: string, tracking: boolean) => void;
  isTracked?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

const SOPHISTICATION_COLORS: Record<SophisticationLevel, string> = {
  [SophisticationLevel.NONE]: '#95a5a6',
  [SophisticationLevel.MINIMAL]: '#f39c12',
  [SophisticationLevel.INTERMEDIATE]: '#e67e22',
  [SophisticationLevel.ADVANCED]: '#e74c3c',
  [SophisticationLevel.EXPERT]: '#8e44ad',
  [SophisticationLevel.INNOVATOR]: '#2c3e50',
  [SophisticationLevel.STRATEGIC]: '#c0392b',
};

const MOTIVATION_ICONS: Record<ThreatMotivation, string> = {
  [ThreatMotivation.ACCIDENTAL]: 'error',
  [ThreatMotivation.COERCION]: 'gavel',
  [ThreatMotivation.DOMINANCE]: 'trending-up',
  [ThreatMotivation.IDEOLOGY]: 'account-balance',
  [ThreatMotivation.NOTORIETY]: 'star',
  [ThreatMotivation.ORGANIZATIONAL_GAIN]: 'business',
  [ThreatMotivation.PERSONAL_GAIN]: 'attach-money',
  [ThreatMotivation.PERSONAL_SATISFACTION]: 'mood',
  [ThreatMotivation.REVENGE]: 'flash-on',
  [ThreatMotivation.UNPREDICTABLE]: 'help',
};

const RESOURCE_LEVEL_COLORS: Record<ResourceLevel, string> = {
  [ResourceLevel.INDIVIDUAL]: '#95a5a6',
  [ResourceLevel.CLUB]: '#3498db',
  [ResourceLevel.CONTEST]: '#9b59b6',
  [ResourceLevel.TEAM]: '#e67e22',
  [ResourceLevel.ORGANIZATION]: '#e74c3c',
  [ResourceLevel.GOVERNMENT]: '#c0392b',
};

export const ThreatActorProfile: React.FC<ThreatActorProfileProps> = ({
  actor,
  onIndicatorPress,
  onCampaignPress,
  onToolPress,
  onTechniquePress,
  onToggleTracking,
  isTracked = false,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'indicators' | 'campaigns' | 'tools' | 'techniques'>('overview');

  const sophisticationColor = SOPHISTICATION_COLORS[actor.sophisticationLevel];
  const resourceColor = RESOURCE_LEVEL_COLORS[actor.resourceLevel];

  const handleToggleTracking = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggleTracking?.(actor.id, !isTracked);
  };

  const renderHeader = () => (
    <Card containerStyle={styles.headerCard}>
      <View style={styles.actorHeader}>
        <View style={styles.actorInfo}>
          <Avatar
            size="large"
            rounded
            title={actor.name.substring(0, 2).toUpperCase()}
            containerStyle={[
              styles.avatarContainer,
              { backgroundColor: sophisticationColor }
            ]}
            titleStyle={styles.avatarTitle}
          />
          
          <View style={styles.actorDetails}>
            <Text style={styles.actorName}>{actor.name}</Text>
            {actor.aliases.length > 0 && (
              <Text style={styles.actorAliases}>
                aka: {actor.aliases.slice(0, 2).join(', ')}
                {actor.aliases.length > 2 && ` +${actor.aliases.length - 2} more`}
              </Text>
            )}
            
            <View style={styles.statusBadges}>
              <Badge
                value={actor.sophisticationLevel}
                badgeStyle={[styles.sophisticationBadge, { backgroundColor: sophisticationColor }]}
                textStyle={styles.badgeText}
              />
              <Badge
                value={actor.resourceLevel}
                badgeStyle={[styles.resourceBadge, { backgroundColor: resourceColor }]}
                textStyle={styles.badgeText}
              />
              {!actor.isActive && (
                <Badge
                  value="INACTIVE"
                  badgeStyle={styles.inactiveBadge}
                  textStyle={styles.badgeText}
                />
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.trackingButton, isTracked && styles.trackingButtonActive]}
          onPress={handleToggleTracking}
        >
          <Icon
            name={isTracked ? 'visibility' : 'visibility-off'}
            type="material"
            size={24}
            color={isTracked ? '#fff' : '#3498db'}
          />
          <Text style={[styles.trackingButtonText, isTracked && styles.trackingButtonTextActive]}>
            {isTracked ? 'Tracking' : 'Track'}
          </Text>
        </TouchableOpacity>
      </View>

      {actor.description && (
        <Text style={styles.description}>{actor.description}</Text>
      )}

      <View style={styles.quickStats}>
        <View style={styles.quickStat}>
          <Text style={styles.quickStatNumber}>{actor.indicators?.length || 0}</Text>
          <Text style={styles.quickStatLabel}>Indicators</Text>
        </View>
        <View style={styles.quickStat}>
          <Text style={styles.quickStatNumber}>{actor.campaigns?.length || 0}</Text>
          <Text style={styles.quickStatLabel}>Campaigns</Text>
        </View>
        <View style={styles.quickStat}>
          <Text style={styles.quickStatNumber}>{actor.tools?.length || 0}</Text>
          <Text style={styles.quickStatLabel}>Tools</Text>
        </View>
        <View style={styles.quickStat}>
          <Text style={styles.quickStatNumber}>{actor.techniques?.length || 0}</Text>
          <Text style={styles.quickStatLabel}>Techniques</Text>
        </View>
      </View>

      <View style={styles.activityInfo}>
        <Text style={styles.activityText}>
          First seen: {format(new Date(actor.firstSeen), 'MMM dd, yyyy')}
        </Text>
        <Text style={styles.activityText}>
          Last seen: {format(new Date(actor.lastSeen), 'MMM dd, yyyy')}
        </Text>
      </View>
    </Card>
  );

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {(['overview', 'indicators', 'campaigns', 'tools', 'techniques'] as const).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, activeTab === tab && styles.activeTab]}
          onPress={() => setActiveTab(tab)}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
          {tab !== 'overview' && (
            <Badge
              value={actor[tab]?.length || 0}
              badgeStyle={[styles.tabBadge, activeTab === tab && styles.activeTabBadge]}
              textStyle={[styles.tabBadgeText, activeTab === tab && styles.activeTabBadgeText]}
            />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      {/* Primary Motivation */}
      <Card containerStyle={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Primary Motivation</Text>
        <View style={styles.motivationContainer}>
          <Icon
            name={MOTIVATION_ICONS[actor.primaryMotivation]}
            type="material"
            size={32}
            color="#3498db"
          />
          <Text style={styles.motivationText}>{actor.primaryMotivation}</Text>
        </View>
        
        {actor.secondaryMotivations.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Secondary Motivations</Text>
            <View style={styles.secondaryMotivations}>
              {actor.secondaryMotivations.map((motivation, index) => (
                <Badge
                  key={index}
                  value={motivation}
                  badgeStyle={styles.motivationBadge}
                  textStyle={styles.motivationBadgeText}
                />
              ))}
            </View>
          </>
        )}
      </Card>

      {/* Kill Chain Phases */}
      <Card containerStyle={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Kill Chain Phases</Text>
        <View style={styles.killChainContainer}>
          {actor.killChainPhases.map((phase, index) => (
            <View key={index} style={styles.killChainPhase}>
              <Icon name="timeline" type="material" size={20} color="#e67e22" />
              <Text style={styles.killChainText}>{phase.replace('_', ' ')}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Intended Effects */}
      <Card containerStyle={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Intended Effects</Text>
        <View style={styles.effectsContainer}>
          {actor.intendedEffect.slice(0, 6).map((effect, index) => (
            <Badge
              key={index}
              value={effect.replace('_', ' ')}
              badgeStyle={styles.effectBadge}
              textStyle={styles.effectBadgeText}
            />
          ))}
          {actor.intendedEffect.length > 6 && (
            <Badge
              value={`+${actor.intendedEffect.length - 6} more`}
              badgeStyle={styles.effectBadge}
              textStyle={styles.effectBadgeText}
            />
          )}
        </View>
      </Card>

      {/* Geographic Focus */}
      <Card containerStyle={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Geographic Focus</Text>
        <View style={styles.geographyContainer}>
          <View style={styles.geographySection}>
            <Text style={styles.geographyLabel}>Regions</Text>
            <Text style={styles.geographyText}>{actor.geography.regions.join(', ')}</Text>
          </View>
          <View style={styles.geographySection}>
            <Text style={styles.geographyLabel}>Countries</Text>
            <Text style={styles.geographyText}>
              {actor.geography.countries.slice(0, 5).join(', ')}
              {actor.geography.countries.length > 5 && ` +${actor.geography.countries.length - 5} more`}
            </Text>
          </View>
        </View>
      </Card>

      {/* Goals */}
      {actor.goals.length > 0 && (
        <Card containerStyle={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Goals</Text>
          {actor.goals.map((goal, index) => (
            <Text key={index} style={styles.goalText}>• {goal}</Text>
          ))}
        </Card>
      )}

      {/* Roles */}
      <Card containerStyle={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Actor Roles</Text>
        <View style={styles.rolesContainer}>
          {actor.roles.map((role, index) => (
            <Badge
              key={index}
              value={role.replace('_', ' ')}
              badgeStyle={styles.roleBadge}
              textStyle={styles.roleBadgeText}
            />
          ))}
        </View>
      </Card>

      {/* Victimology */}
      {actor.victimology && (
        <Card containerStyle={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Victimology</Text>
          
          <Text style={styles.subsectionTitle}>Targeted Sectors</Text>
          <View style={styles.sectorsContainer}>
            {actor.victimology.targetedSectors.slice(0, 8).map((sector, index) => (
              <Badge
                key={index}
                value={sector.replace('_', ' ')}
                badgeStyle={styles.sectorBadge}
                textStyle={styles.sectorBadgeText}
              />
            ))}
            {actor.victimology.targetedSectors.length > 8 && (
              <Badge
                value={`+${actor.victimology.targetedSectors.length - 8}`}
                badgeStyle={styles.sectorBadge}
                textStyle={styles.sectorBadgeText}
              />
            )}
          </View>
          
          <Text style={styles.subsectionTitle}>Target Organization Sizes</Text>
          <View style={styles.orgSizesContainer}>
            {actor.victimology.organizationSize.map((size, index) => (
              <Badge
                key={index}
                value={size}
                badgeStyle={styles.orgSizeBadge}
                textStyle={styles.orgSizeBadgeText}
              />
            ))}
          </View>
        </Card>
      )}

      {/* Attribution */}
      {actor.attribution && (
        <Card containerStyle={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Attribution Assessment</Text>
          <View style={styles.attributionContainer}>
            <View style={styles.attributionHeader}>
              <Badge
                value={`Confidence: ${actor.attribution.confidence}`}
                badgeStyle={[
                  styles.confidenceBadge,
                  { backgroundColor: actor.attribution.confidence === 'HIGH' ? '#27ae60' : '#f39c12' }
                ]}
                textStyle={styles.badgeText}
              />
            </View>
            <Text style={styles.attributionReasoning}>{actor.attribution.reasoning}</Text>
            
            {actor.attribution.alternativeHypotheses.length > 0 && (
              <>
                <Text style={styles.subsectionTitle}>Alternative Hypotheses</Text>
                {actor.attribution.alternativeHypotheses.map((hypothesis, index) => (
                  <Text key={index} style={styles.hypothesisText}>• {hypothesis}</Text>
                ))}
              </>
            )}
          </View>
        </Card>
      )}
    </View>
  );

  const renderIndicatorsTab = () => (
    <View style={styles.tabContent}>
      {actor.indicators && actor.indicators.length > 0 ? (
        actor.indicators.map((indicator, index) => (
          <TouchableOpacity
            key={indicator.id}
            onPress={() => onIndicatorPress?.(indicator)}
          >
            <ListItem containerStyle={styles.listItem}>
              <Icon name="fingerprint" type="material" size={24} color="#3498db" />
              <ListItem.Content>
                <ListItem.Title style={styles.listItemTitle}>
                  {indicator.value}
                </ListItem.Title>
                <ListItem.Subtitle style={styles.listItemSubtitle}>
                  {indicator.type} • {indicator.confidence}
                </ListItem.Subtitle>
              </ListItem.Content>
              <Badge
                value={indicator.tlpLevel}
                badgeStyle={styles.tlpBadge}
                textStyle={styles.badgeText}
              />
              <Icon name="chevron-right" type="material" size={24} color="#bdc3c7" />
            </ListItem>
          </TouchableOpacity>
        ))
      ) : (
        <Card containerStyle={styles.emptyCard}>
          <Text style={styles.emptyText}>No indicators available</Text>
        </Card>
      )}
    </View>
  );

  const renderCampaignsTab = () => (
    <View style={styles.tabContent}>
      {actor.campaigns && actor.campaigns.length > 0 ? (
        actor.campaigns.map((campaign, index) => (
          <TouchableOpacity
            key={campaign.id}
            onPress={() => onCampaignPress?.(campaign)}
          >
            <ListItem containerStyle={styles.listItem}>
              <Icon name="campaign" type="material" size={24} color="#e74c3c" />
              <ListItem.Content>
                <ListItem.Title style={styles.listItemTitle}>
                  {campaign.name}
                </ListItem.Title>
                <ListItem.Subtitle style={styles.listItemSubtitle}>
                  {campaign.status} • {campaign.confidence}
                </ListItem.Subtitle>
                <Text style={styles.campaignObjectives}>
                  {campaign.objectives.slice(0, 2).join(', ')}
                  {campaign.objectives.length > 2 && '...'}
                </Text>
              </ListItem.Content>
              <Badge
                value={campaign.status}
                badgeStyle={[
                  styles.statusBadge,
                  { backgroundColor: campaign.status === 'ONGOING' ? '#e74c3c' : '#95a5a6' }
                ]}
                textStyle={styles.badgeText}
              />
              <Icon name="chevron-right" type="material" size={24} color="#bdc3c7" />
            </ListItem>
          </TouchableOpacity>
        ))
      ) : (
        <Card containerStyle={styles.emptyCard}>
          <Text style={styles.emptyText}>No campaigns available</Text>
        </Card>
      )}
    </View>
  );

  const renderToolsTab = () => (
    <View style={styles.tabContent}>
      {actor.tools && actor.tools.length > 0 ? (
        actor.tools.map((tool, index) => (
          <TouchableOpacity
            key={tool.id}
            onPress={() => onToolPress?.(tool)}
          >
            <ListItem containerStyle={styles.listItem}>
              <Icon name="build" type="material" size={24} color="#9b59b6" />
              <ListItem.Content>
                <ListItem.Title style={styles.listItemTitle}>
                  {tool.name}
                </ListItem.Title>
                <ListItem.Subtitle style={styles.listItemSubtitle}>
                  {tool.type} • {tool.platform.join(', ')}
                </ListItem.Subtitle>
                <Text style={styles.toolCapabilities}>
                  {tool.capabilities.slice(0, 3).join(', ')}
                  {tool.capabilities.length > 3 && '...'}
                </Text>
              </ListItem.Content>
              <Badge
                value={tool.isActive ? 'ACTIVE' : 'INACTIVE'}
                badgeStyle={[
                  styles.statusBadge,
                  { backgroundColor: tool.isActive ? '#27ae60' : '#95a5a6' }
                ]}
                textStyle={styles.badgeText}
              />
              <Icon name="chevron-right" type="material" size={24} color="#bdc3c7" />
            </ListItem>
          </TouchableOpacity>
        ))
      ) : (
        <Card containerStyle={styles.emptyCard}>
          <Text style={styles.emptyText}>No tools available</Text>
        </Card>
      )}
    </View>
  );

  const renderTechniquesTab = () => (
    <View style={styles.tabContent}>
      {actor.techniques && actor.techniques.length > 0 ? (
        actor.techniques.map((technique, index) => (
          <TouchableOpacity
            key={technique.id}
            onPress={() => onTechniquePress?.(technique)}
          >
            <ListItem containerStyle={styles.listItem}>
              <Icon name="security" type="material" size={24} color="#f39c12" />
              <ListItem.Content>
                <ListItem.Title style={styles.listItemTitle}>
                  {technique.name}
                </ListItem.Title>
                <ListItem.Subtitle style={styles.listItemSubtitle}>
                  {technique.mitreId || 'Custom'} • {technique.tactic}
                </ListItem.Subtitle>
                <Text style={styles.techniqueDescription} numberOfLines={2}>
                  {technique.description}
                </Text>
              </ListItem.Content>
              <Icon name="chevron-right" type="material" size={24} color="#bdc3c7" />
            </ListItem>
          </TouchableOpacity>
        ))
      ) : (
        <Card containerStyle={styles.emptyCard}>
          <Text style={styles.emptyText}>No techniques available</Text>
        </Card>
      )}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'indicators':
        return renderIndicatorsTab();
      case 'campaigns':
        return renderCampaignsTab();
      case 'tools':
        return renderToolsTab();
      case 'techniques':
        return renderTechniquesTab();
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderHeader()}
      {renderTabBar()}
      {renderTabContent()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerCard: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  actorInfo: {
    flex: 1,
    flexDirection: 'row',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  actorDetails: {
    flex: 1,
  },
  actorName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  actorAliases: {
    fontSize: 14,
    color: '#7f8c8d',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  statusBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sophisticationBadge: {
    marginRight: 8,
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resourceBadge: {
    marginRight: 8,
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inactiveBadge: {
    backgroundColor: '#e74c3c',
    marginRight: 8,
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  trackingButton: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3498db',
    backgroundColor: 'transparent',
    marginLeft: 12,
  },
  trackingButtonActive: {
    backgroundColor: '#3498db',
  },
  trackingButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3498db',
    marginTop: 4,
  },
  trackingButtonTextActive: {
    color: '#fff',
  },
  description: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
    marginBottom: 16,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#ecf0f1',
    marginBottom: 12,
  },
  quickStat: {
    alignItems: 'center',
  },
  quickStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  activityInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  activityText: {
    fontSize: 12,
    color: '#95a5a6',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: '#3498db',
  },
  tabText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7f8c8d',
  },
  activeTabText: {
    color: '#fff',
  },
  tabBadge: {
    backgroundColor: '#ecf0f1',
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activeTabBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabBadgeText: {
    fontSize: 10,
    color: '#7f8c8d',
  },
  activeTabBadgeText: {
    color: '#fff',
  },
  tabContent: {
    paddingBottom: 20,
  },
  sectionCard: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34495e',
    marginTop: 12,
    marginBottom: 8,
  },
  motivationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  motivationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 12,
  },
  secondaryMotivations: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  motivationBadge: {
    backgroundColor: '#ecf0f1',
    marginRight: 8,
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  motivationBadgeText: {
    fontSize: 11,
    color: '#34495e',
  },
  killChainContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  killChainPhase: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef9e7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  killChainText: {
    fontSize: 12,
    color: '#e67e22',
    fontWeight: '600',
    marginLeft: 8,
  },
  effectsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  effectBadge: {
    backgroundColor: '#e8f4f8',
    marginRight: 8,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  effectBadgeText: {
    fontSize: 11,
    color: '#2980b9',
    fontWeight: '500',
  },
  geographyContainer: {},
  geographySection: {
    marginBottom: 12,
  },
  geographyLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34495e',
    marginBottom: 4,
  },
  geographyText: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
  goalText: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 8,
    lineHeight: 20,
  },
  rolesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  roleBadge: {
    backgroundColor: '#f8e6ff',
    marginRight: 8,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    color: '#8e44ad',
    fontWeight: '500',
  },
  sectorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  sectorBadge: {
    backgroundColor: '#fff3e0',
    marginRight: 6,
    marginBottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sectorBadgeText: {
    fontSize: 10,
    color: '#f57c00',
    fontWeight: '500',
  },
  orgSizesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  orgSizeBadge: {
    backgroundColor: '#e3f2fd',
    marginRight: 8,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  orgSizeBadgeText: {
    fontSize: 11,
    color: '#1976d2',
    fontWeight: '500',
  },
  attributionContainer: {},
  attributionHeader: {
    marginBottom: 12,
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  attributionReasoning: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
    marginBottom: 12,
  },
  hypothesisText: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 6,
    lineHeight: 18,
  },
  listItem: {
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  campaignObjectives: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 4,
    fontStyle: 'italic',
  },
  toolCapabilities: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 4,
    fontStyle: 'italic',
  },
  techniqueDescription: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 4,
    lineHeight: 16,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  tlpBadge: {
    backgroundColor: '#34495e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  emptyCard: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
});

export default ThreatActorProfile;