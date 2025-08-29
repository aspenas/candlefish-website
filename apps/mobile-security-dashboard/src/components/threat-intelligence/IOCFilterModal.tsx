import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Button, Header, CheckBox, ButtonGroup } from 'react-native-elements';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ThreatIntelligenceFilter,
  IOCType,
  ConfidenceLevel,
  TLPLevel,
} from '../../types/security';

interface IOCFilterModalProps {
  filter?: ThreatIntelligenceFilter;
  onApply: (filter: ThreatIntelligenceFilter) => void;
  onClose: () => void;
}

const IOC_TYPE_OPTIONS = [
  { label: 'IP Address', value: IOCType.IP_ADDRESS },
  { label: 'Domain', value: IOCType.DOMAIN },
  { label: 'URL', value: IOCType.URL },
  { label: 'File Hash (MD5)', value: IOCType.FILE_HASH_MD5 },
  { label: 'File Hash (SHA1)', value: IOCType.FILE_HASH_SHA1 },
  { label: 'File Hash (SHA256)', value: IOCType.FILE_HASH_SHA256 },
  { label: 'Email', value: IOCType.EMAIL },
  { label: 'User Agent', value: IOCType.USER_AGENT },
  { label: 'Certificate', value: IOCType.CERTIFICATE },
  { label: 'Registry Key', value: IOCType.REGISTRY_KEY },
  { label: 'Mutex', value: IOCType.MUTEX },
  { label: 'File Path', value: IOCType.FILE_PATH },
  { label: 'Process Name', value: IOCType.PROCESS_NAME },
  { label: 'YARA Rule', value: IOCType.YARA_RULE },
  { label: 'CVE', value: IOCType.CVE },
  { label: 'Bitcoin Address', value: IOCType.BITCOIN_ADDRESS },
];

const CONFIDENCE_OPTIONS = [
  { label: 'Low', value: ConfidenceLevel.LOW },
  { label: 'Medium', value: ConfidenceLevel.MEDIUM },
  { label: 'High', value: ConfidenceLevel.HIGH },
  { label: 'Confirmed', value: ConfidenceLevel.CONFIRMED },
];

const TLP_OPTIONS = [
  { label: 'TLP:WHITE', value: TLPLevel.WHITE },
  { label: 'TLP:GREEN', value: TLPLevel.GREEN },
  { label: 'TLP:AMBER', value: TLPLevel.AMBER },
  { label: 'TLP:RED', value: TLPLevel.RED },
];

const ACTIVITY_STATUS_OPTIONS = ['All', 'Active Only', 'Inactive Only'];

export const IOCFilterModal: React.FC<IOCFilterModalProps> = ({
  filter = {},
  onApply,
  onClose,
}) => {
  const [localFilter, setLocalFilter] = useState<ThreatIntelligenceFilter>(filter);
  const [selectedIOCTypes, setSelectedIOCTypes] = useState<Set<IOCType>>(
    new Set(filter.iocTypes || [])
  );
  const [selectedConfidenceLevels, setSelectedConfidenceLevels] = useState<Set<ConfidenceLevel>>(
    new Set(filter.confidenceLevels || [])
  );
  const [selectedTLPLevels, setSelectedTLPLevels] = useState<Set<TLPLevel>>(
    new Set(filter.tlpLevels || [])
  );
  const [activityStatusIndex, setActivityStatusIndex] = useState(
    filter.isActive === undefined ? 0 : filter.isActive ? 1 : 2
  );

  useEffect(() => {
    // Update local filter when selections change
    const updatedFilter: ThreatIntelligenceFilter = {
      ...localFilter,
      iocTypes: selectedIOCTypes.size > 0 ? Array.from(selectedIOCTypes) : undefined,
      confidenceLevels: selectedConfidenceLevels.size > 0 ? Array.from(selectedConfidenceLevels) : undefined,
      tlpLevels: selectedTLPLevels.size > 0 ? Array.from(selectedTLPLevels) : undefined,
      isActive: activityStatusIndex === 0 ? undefined : activityStatusIndex === 1,
    };
    
    setLocalFilter(updatedFilter);
  }, [selectedIOCTypes, selectedConfidenceLevels, selectedTLPLevels, activityStatusIndex]);

  const handleIOCTypeToggle = (type: IOCType) => {
    const newSelection = new Set(selectedIOCTypes);
    if (newSelection.has(type)) {
      newSelection.delete(type);
    } else {
      newSelection.add(type);
    }
    setSelectedIOCTypes(newSelection);
  };

  const handleConfidenceLevelToggle = (level: ConfidenceLevel) => {
    const newSelection = new Set(selectedConfidenceLevels);
    if (newSelection.has(level)) {
      newSelection.delete(level);
    } else {
      newSelection.add(level);
    }
    setSelectedConfidenceLevels(newSelection);
  };

  const handleTLPLevelToggle = (level: TLPLevel) => {
    const newSelection = new Set(selectedTLPLevels);
    if (newSelection.has(level)) {
      newSelection.delete(level);
    } else {
      newSelection.add(level);
    }
    setSelectedTLPLevels(newSelection);
  };

  const handleSelectAllIOCTypes = () => {
    if (selectedIOCTypes.size === IOC_TYPE_OPTIONS.length) {
      setSelectedIOCTypes(new Set());
    } else {
      setSelectedIOCTypes(new Set(IOC_TYPE_OPTIONS.map(opt => opt.value)));
    }
  };

  const handleSelectAllConfidenceLevels = () => {
    if (selectedConfidenceLevels.size === CONFIDENCE_OPTIONS.length) {
      setSelectedConfidenceLevels(new Set());
    } else {
      setSelectedConfidenceLevels(new Set(CONFIDENCE_OPTIONS.map(opt => opt.value)));
    }
  };

  const handleSelectAllTLPLevels = () => {
    if (selectedTLPLevels.size === TLP_OPTIONS.length) {
      setSelectedTLPLevels(new Set());
    } else {
      setSelectedTLPLevels(new Set(TLP_OPTIONS.map(opt => opt.value)));
    }
  };

  const handleReset = () => {
    setSelectedIOCTypes(new Set());
    setSelectedConfidenceLevels(new Set());
    setSelectedTLPLevels(new Set());
    setActivityStatusIndex(0);
    setLocalFilter({});
  };

  const handleApply = () => {
    onApply(localFilter);
  };

  const getFilterCount = () => {
    let count = 0;
    if (selectedIOCTypes.size > 0) count++;
    if (selectedConfidenceLevels.size > 0) count++;
    if (selectedTLPLevels.size > 0) count++;
    if (activityStatusIndex !== 0) count++;
    return count;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        centerComponent={{
          text: 'Filter IOCs',
          style: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
        }}
        rightComponent={{
          icon: 'close',
          color: '#fff',
          onPress: onClose
        }}
        backgroundColor="#3498db"
        barStyle="light-content"
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Activity Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Status</Text>
          <ButtonGroup
            buttons={ACTIVITY_STATUS_OPTIONS}
            selectedIndex={activityStatusIndex}
            onPress={setActivityStatusIndex}
            containerStyle={styles.buttonGroup}
            selectedButtonStyle={styles.selectedButton}
            textStyle={styles.buttonText}
            selectedTextStyle={styles.selectedButtonText}
          />
        </View>

        {/* IOC Types */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>IOC Types</Text>
            <TouchableOpacity onPress={handleSelectAllIOCTypes}>
              <Text style={styles.selectAllText}>
                {selectedIOCTypes.size === IOC_TYPE_OPTIONS.length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.checkboxGrid}>
            {IOC_TYPE_OPTIONS.map((option) => (
              <CheckBox
                key={option.value}
                title={option.label}
                checked={selectedIOCTypes.has(option.value)}
                onPress={() => handleIOCTypeToggle(option.value)}
                containerStyle={styles.checkboxContainer}
                textStyle={styles.checkboxText}
                checkedColor="#3498db"
                size={18}
              />
            ))}
          </View>
        </View>

        {/* Confidence Levels */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Confidence Levels</Text>
            <TouchableOpacity onPress={handleSelectAllConfidenceLevels}>
              <Text style={styles.selectAllText}>
                {selectedConfidenceLevels.size === CONFIDENCE_OPTIONS.length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.checkboxRow}>
            {CONFIDENCE_OPTIONS.map((option) => (
              <CheckBox
                key={option.value}
                title={option.label}
                checked={selectedConfidenceLevels.has(option.value)}
                onPress={() => handleConfidenceLevelToggle(option.value)}
                containerStyle={[styles.checkboxContainer, styles.inlineCheckbox]}
                textStyle={styles.checkboxText}
                checkedColor="#3498db"
                size={18}
              />
            ))}
          </View>
        </View>

        {/* TLP Levels */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>TLP Levels</Text>
            <TouchableOpacity onPress={handleSelectAllTLPLevels}>
              <Text style={styles.selectAllText}>
                {selectedTLPLevels.size === TLP_OPTIONS.length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.checkboxRow}>
            {TLP_OPTIONS.map((option) => (
              <CheckBox
                key={option.value}
                title={option.label}
                checked={selectedTLPLevels.has(option.value)}
                onPress={() => handleTLPLevelToggle(option.value)}
                containerStyle={[styles.checkboxContainer, styles.inlineCheckbox]}
                textStyle={styles.checkboxText}
                checkedColor="#3498db"
                size={18}
              />
            ))}
          </View>
        </View>

        {/* Filter Summary */}
        {getFilterCount() > 0 && (
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>Filter Summary</Text>
            <Text style={styles.summaryText}>
              {getFilterCount()} filter(s) active
            </Text>
            
            {selectedIOCTypes.size > 0 && (
              <Text style={styles.summaryDetail}>
                • {selectedIOCTypes.size} IOC type(s) selected
              </Text>
            )}
            
            {selectedConfidenceLevels.size > 0 && (
              <Text style={styles.summaryDetail}>
                • {selectedConfidenceLevels.size} confidence level(s) selected
              </Text>
            )}
            
            {selectedTLPLevels.size > 0 && (
              <Text style={styles.summaryDetail}>
                • {selectedTLPLevels.size} TLP level(s) selected
              </Text>
            )}
            
            {activityStatusIndex !== 0 && (
              <Text style={styles.summaryDetail}>
                • {ACTIVITY_STATUS_OPTIONS[activityStatusIndex]} filter active
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          title="Reset"
          buttonStyle={[styles.actionButton, styles.resetButton]}
          titleStyle={styles.resetButtonText}
          onPress={handleReset}
          disabled={getFilterCount() === 0}
        />
        
        <Button
          title={`Apply${getFilterCount() > 0 ? ` (${getFilterCount()})` : ''}`}
          buttonStyle={[styles.actionButton, styles.applyButton]}
          titleStyle={styles.applyButtonText}
          onPress={handleApply}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  selectAllText: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '600',
  },
  buttonGroup: {
    marginLeft: 0,
    marginRight: 0,
    marginTop: 0,
    marginBottom: 0,
    borderRadius: 8,
  },
  selectedButton: {
    backgroundColor: '#3498db',
  },
  buttonText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  selectedButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  checkboxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  checkboxRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  checkboxContainer: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    marginLeft: 0,
    marginRight: 0,
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  inlineCheckbox: {
    width: '48%',
    marginBottom: 8,
  },
  checkboxText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#34495e',
    marginLeft: 8,
  },
  summarySection: {
    backgroundColor: '#e8f4f8',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 8,
    fontWeight: '600',
  },
  summaryDetail: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
  },
  resetButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#95a5a6',
    marginRight: 8,
  },
  resetButtonText: {
    color: '#95a5a6',
    fontWeight: 'bold',
  },
  applyButton: {
    backgroundColor: '#3498db',
    marginLeft: 8,
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default IOCFilterModal;