import React, { useState, useEffect } from 'react';
import { Card,Row,Col, Input, Button, Table, Dropdown, Space, Typography, Menu, message, Modal } from 'antd';
import { SoundOutlined, MoreOutlined, PlusOutlined, EditOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';

const { Title } = Typography;

const Word = () => {
  const [userId, setUserId] = useState('');
  const [word, setWord] = useState('');
  const [wordList, setWordList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [extraColumns, setExtraColumns] = useState(['meanings', 'examples']); // Show these by default
  const [editingCell, setEditingCell] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingWord, setEditingWord] = useState(null);
  const URL = process.env.REACT_APP_BACKEND_URL;
  useEffect(() => {
    fetchWords();
  }, []);
  const getShortForm = (partOfSpeech) => {
    switch (partOfSpeech) {
      case 'noun':
        return 'n.';
      case 'verb':
        return 'v.';
      case 'adjective':
        return 'adj.';
      case 'adverb':
        return 'adv.';
      // Add more cases as needed for other parts of speech
      default:
        return partOfSpeech; // Return the full part of speech if no match is found
    }
  };
  
  const fetchWords = async () => {
    try {
      const response = await fetch(`${URL}/api/words`, {
        method: 'GET',
        credentials: 'include', // This ensures that cookies are sent along with the request
      });
      
      if (response.status === 401) {
        message.error('Unauthorized. Please log in.');
        return;
      }
  
      const data = await response.json();
      setWordList(data.map(word => ({ ...word, key: word._id })));
      setUserId(data[0]?.userId || '');
    } catch (error) {
      message.error('Error fetching words');
    }
  };
  

  const fetchWordDetails = async (text) => {
    const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${text}`;
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Dictionary API returned ${response.status}`);
      }
      const data = await response.json();

      if (!data || !data[0]) {
        throw new Error('No word data found');
      }

      const partsOfSpeech = [...new Set(data[0]?.meanings?.map(m => m.partOfSpeech) || [])];
      const shortForms = partsOfSpeech.map(pos => getShortForm(pos)).join(', ');
      
      const audioUrl = data[0]?.phonetics?.find(phonetic => phonetic.audio)?.audio || '';
      const pronunciation = data[0]?.phonetics?.find(phonetic => phonetic.text)?.text || '';
      
      const synonyms = [...new Set(data[0]?.meanings?.flatMap(m => 
        m.definitions?.flatMap(d => d.synonyms || []) || []
      ) || [])];

      return { 
        audioUrl, 
        pronunciation,
        partsOfSpeech: shortForms,
        meanings: synonyms.join(', '), // Join synonyms into a string
        examples: data[0]?.meanings?.[0]?.definitions?.[0]?.example || '',
        originalMeanings: data[0]?.meanings || []
      };
    } catch (error) {
      console.error('Error fetching word details:', error);
      message.error(`Error fetching word details: ${error.message}`);
      return null;
    }
  };
  const handleAddWord = async () => {
    if (!word.trim()) {
      message.warning('Please enter a word');
      return;
    }
  
    // Check if the word already exists in the current word list
    const isDuplicate = wordList.some(w => w.word.toLowerCase() === word.trim().toLowerCase());
    if (isDuplicate) {
      message.warning('Word already exists in your collection');
      return;
    }
    
    setLoading(true);
    try {
      const details = await fetchWordDetails(word);
      if (!details) {
        setLoading(false);
        return; // fetchWordDetails will show its own error message
      }
  
      const response = await fetch(`${URL}/api/words`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          word: word.trim(),
          audioUrl: details.audioUrl,
          partsOfSpeech: details.partsOfSpeech,
          pronunciation: details.pronunciation,
          meanings: details.meanings,
          examples: details.examples,
          originalMeanings: details.originalMeanings
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error saving word');
      }
      
      const savedWord = await response.json();
      setWordList(prev => [{ ...savedWord, key: savedWord._id }, ...prev]);
      setWord('');
      setUserId('');
      message.success('Word added successfully'); // Only one success message
    } catch (error) {
      console.error('Error in handleAddWord:', error);
      message.error(error.message || 'Error saving word');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddWordOrUserId = async () => {
    if (!word.trim()) {
      message.warning('Please enter a word or user ID');
      return;
    }
    
    // Check if the input looks like a word or a user ID
    const isUserId = word.trim().length === 24; // Assuming user ID is a 24-character string
  
    if (isUserId) {
      // Treat the input as a friend's user ID
      await fetchFriendWords(word.trim());
    } else {
      // Treat the input as a word
      await handleAddWord();
    }
    setWord(''); // Clear word input after adding
  setUserId(''); // Clear userId after adding
  };
  
  const fetchFriendWords = async (friendUserId) => {
    setLoading(true);
    try {
      const response = await fetch(`${URL}/api/words/friend/${friendUserId}`, {
        method: 'GET',
        credentials: 'include',
      });
  
      if (!response.ok) {
        throw new Error('Error fetching friend\'s word collection');
      }
  
      const friendWords = await response.json();
  
      // Append only unique words to the current user's word list and save them to the backend
      const uniqueWords = friendWords.filter(
        fw => !wordList.some(uw => uw.word === fw.word)
      );
  
      // Save each unique word to the backend (to persist in your own collection)
      for (let word of uniqueWords) {
        await saveFriendWordToOwnCollection(word);
      }
  
      // Update wordList in the frontend UI
      setWordList(prev => [...prev, ...uniqueWords.map(word => ({ ...word, key: word._id }))]);
      message.success('Friend\'s word collection added and saved successfully');
    } catch (error) {
      message.error(error.message || 'Error fetching friend\'s words');
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to save fetched friend's word into user's own collection
  const saveFriendWordToOwnCollection = async (word) => {
    try {
      const response = await fetch(`${URL}/api/words`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          word: word.word,
          audioUrl: word.audioUrl,
          partsOfSpeech: word.partsOfSpeech,
          pronunciation: word.pronunciation,
          meanings: word.meanings,
          examples: word.examples,
          originalMeanings: word.originalMeanings,
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error saving friend\'s word');
      }
  
      const savedWord = await response.json();
      message.success(`Word "${savedWord.word}" saved to your collection`);
    } catch (error) {
      console.error('Error saving friend\'s word to collection:', error);
    }
  };
  
  

  const handleDeleteWord = async (record) => {
    try {
      await fetch(`${URL}/api/words/${record._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', 
      });
      setWordList(prev => prev.filter(item => item._id !== record._id));
      message.success('Word deleted successfully');
    } catch (error) {
      message.error('Error deleting word');
    }
  };

  const handleCellEdit = async (record, field, value) => {
    try {
      const updatedField = { [field]: value }; // Only update the changed field
  
      const response = await fetch(`${URL}/api/words/${record._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedField), // Send only the edited field
      });
  
      const updatedWord = await response.json();
  
      // Update the word list with the edited field
      setWordList(prev => 
        prev.map(item => 
          item._id === record._id ? { ...item, [field]: value } : item
        )
      );
      setEditingCell(null);
      message.success('Updated successfully');
    } catch (error) {
      message.error('Error updating word');
    }
  };
  
  const copyUserIdToClipboard = () => {
    navigator.clipboard.writeText(userId).then(() => {
      message.success('User ID copied to clipboard!');
    }).catch(err => {
      message.error('Failed to copy user ID');
      console.error('Error copying to clipboard: ', err);
    });
  };
  
  
  const handleWordEdit = async (values) => {
    try {
      // Check if the word itself has changed
      const isWordChanged = values.word !== editingWord.word;
      
      // If the word has changed, remove meanings and examples
      const dataToUpdate = isWordChanged ? {
        ...values,
        meanings: '', // Reset meanings
        examples: ''  // Reset examples
      } : values;

      const response = await fetch(`${URL}/api/words/${editingWord._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(dataToUpdate),
      });

      const updatedWord = await response.json();
      setWordList(prev => 
        prev.map(item => 
          item._id === editingWord._id ? { ...updatedWord, key: updatedWord._id } : item
        )
      );
      setEditModalVisible(false);
      setEditingWord(null);
      message.success('Word updated successfully');
      
      // Show additional message if fields were reset
      if (isWordChanged) {
        message.info('Meaning and example have been reset for the new word');
      }
    } catch (error) {
      message.error('Error updating word');
    }
  };

  const getTableColumns = () => {
    const baseColumns = [
      {
        title: 'SN',
        key: 'sn',
        render: (_, __, index) => <span>{index + 1}</span>, // Adding Serial Number
      },
      {
        title: 'Word',
        dataIndex: 'word',
        key: 'word',
        render: (text, record) => (
          <div onDoubleClick={() => {
            setEditingWord(record);
            setEditModalVisible(true);
          }}>
            <span style={{ fontWeight: 500 }}>{text}</span>
            {record.partsOfSpeech && (
              <div style={{ fontSize: '12px', color: '#666' }}>{record.partsOfSpeech}</div>
            )}
          </div>
        ),
      },
      {
        title: 'Pronunciation',
        dataIndex: 'pronunciation',
        key: 'pronunciation',
        render: (text, record) => (
          <Space>
            <span>{text}</span>
            {record.audioUrl && (
              <SoundOutlined 
                style={{ cursor: 'pointer', color: '#1890ff' }}
                onClick={() => {
                  const audio = new Audio(record.audioUrl);
                  audio.play();
                }}
              />
            )}
          </Space>
        ),
      },
    ];

    if (extraColumns.includes('meanings')) {
      baseColumns.push({
        title: 'Meaning',
        dataIndex: 'meanings',
        key: 'meanings',
        render: (text, record) => (
          editingCell?.record._id === record._id && editingCell?.field === 'meanings' ? (
            <Input
              defaultValue={text}
              onPressEnter={(e) => handleCellEdit(record, 'meanings', e.target.value)}
              onBlur={() => setEditingCell(null)}
              autoFocus
            />
          ) : (
            <div 
              style={{ cursor: 'pointer', padding: '4px' }}
              onDoubleClick={() => setEditingCell({ record, field: 'meanings' })}
            >
              {text || 'Double click to add meaning'}
            </div>
          )
        ),
      });
    }

    if (extraColumns.includes('examples')) {
      baseColumns.push({
        title: 'Example',
        dataIndex: 'examples',
        key: 'examples',
        width: 300,
        render: (text, record) => (
          editingCell?.record._id === record._id && editingCell?.field === 'examples' ? (
            <Input
              defaultValue={text}
              onPressEnter={(e) => handleCellEdit(record, 'examples', e.target.value)}
              onBlur={() => setEditingCell(null)}
              autoFocus
            />
          ) : (
            <div 
              style={{ cursor: 'pointer', padding: '4px' }}
              onDoubleClick={() => setEditingCell({ record, field: 'examples' })}
            >
              {text || 'Double click to add example'}
            </div>
          )
        ),
      });
    }

    baseColumns.push({
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <EditOutlined 
            onClick={() => {
              setEditingWord(record);
              setEditModalVisible(true);
            }}
          />
          <DeleteOutlined 
            onClick={() => Modal.confirm({
              title: 'Delete Word',
              content: `Are you sure you want to delete "${record.word}"?`,
              onOk: () => handleDeleteWord(record)
            })}
          />
        </Space>
      ),
    });

    return baseColumns;
  };

  const EditWordModal = () => {
    const [currentWord, setCurrentWord] = useState(editingWord?.word || '');
    const [showResetWarning, setShowResetWarning] = useState(false);

    // Monitor word changes to show warning
    useEffect(() => {
      if (editingWord?.word !== currentWord) {
        setShowResetWarning(true);
      } else {
        setShowResetWarning(false);
      }
    }, [currentWord]);

    return (
      <Modal
        title="Edit Word"
        open={editModalVisible}
        onOk={() => {
          const form = document.getElementById('editWordForm');
          const formData = new FormData(form);
          handleWordEdit(Object.fromEntries(formData));
        }}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingWord(null);
        }}
      >
        <form id="editWordForm">
          <div style={{ marginBottom: 16 }}>
            <div>Word:</div>
            <Input 
              name="word" 
              defaultValue={editingWord?.word}
              onChange={(e) => setCurrentWord(e.target.value)}
            />
            {showResetWarning && (
              <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>
                Changing the word will reset its meaning and example
              </div>
            )}
          </div>
          <div style={{ marginBottom: 16 }}>
            <div>Meaning:</div>
            <Input.TextArea 
              name="meanings" 
              defaultValue={editingWord?.meanings}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div>Example:</div>
            <Input.TextArea 
              name="examples" 
              defaultValue={editingWord?.examples}
            />
          </div>
        </form>
      </Modal>
    );
  };


  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card style={{ marginBottom: '24px' }}>
      <Row justify="space-between" align="middle">
      <Col>
            <Title level={4} style={{ marginBottom: '16px' }}>Add New Word</Title>
          </Col>
          <Col>
            <Title level={5}>Total Words: {wordList.length}</Title>
          </Col>
          <Col>
          <span onClick={copyUserIdToClipboard} style={{ cursor: 'pointer', color: '#1890ff' }}>
              Share Your Collection <CopyOutlined />
            </span>
          </Col>
        </Row>
        <Space.Compact style={{ width: '100%' }}>
          <Input
             placeholder="Enter a word or friend\'s User ID"
             value={word}
             onChange={(e) => setWord(e.target.value)}
             onPressEnter={handleAddWordOrUserId}
          />
          <Button 
             type="primary"
             onClick={handleAddWordOrUserId}
             loading={loading}
          >
           Add Word / Fetch Friend's Collection
          </Button>
        </Space.Compact>
      </Card>

      <Table 
        columns={getTableColumns()}
        dataSource={wordList}
        pagination={{ pageSize: 10 }}
        rowClassName="custom-row"
      />

      {editModalVisible && <EditWordModal />}
    </div>
  );
};

export default Word;