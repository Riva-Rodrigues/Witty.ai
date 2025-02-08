import express from 'express';
import { Client } from '@notionhq/client';
import cookieParser from "cookie-parser"
import cors from "cors"
import axios from "axios"
import OpenAI from 'openai';

const app = express()

app.use(cors({
    origin: true,
    credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cookieParser())

const router = express.Router();
app.use('/api', router);

const notion = new Client({ auth: "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" });

const getTodayTimeRange = () => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    
    return {
      start: startOfDay.toISOString(),
      end: endOfDay.toISOString()
    };
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Create a new database in Notion
router.post('/create-database', async (req, res) => {
    const { parentPageId } = req.body;

    if (!parentPageId) {
        return res.status(400).json({ 
            success: false, 
            error: 'Parent page ID is required' 
        });
    }

    try {
        const database = await notion.databases.create({
            parent: {
                type: "page_id",
                page_id: parentPageId
            },
            title: [
                {
                    type: "text",
                    text: {
                        content: "Tasks"
                    }
                }
            ],
            icon: {
                type: "emoji",
                emoji: "📋"
            },
            properties: {
                Task: {
                    type: "title",
                    title: {}
                },
                Status: {
                    type: "select",
                    select: {
                        options: [
                            {
                                name: "Not started",
                                color: "gray"
                            },
                            {
                                name: "In progress",
                                color: "blue"
                            }
                        ]
                    }
                },
                Assignee: {
                    type: "people",
                    people: {}  // Fixed: Proper format for people property
                },
                Due: {
                    type: "date",
                    date: {}    // Fixed: Proper format for date property
                },
                Project: {
                    type: "select",
                    select: {
                        options: [
                            {
                                name: "Matcha",
                                color: "green"
                            },
                            {
                                name: "Bugs",
                                color: "red"
                            },
                            {
                                name: "Juniper | (B2C)",
                                color: "blue"
                            }
                        ]
                    }
                }
            }
        });

        res.json({ 
            success: true, 
            database: database,
            message: 'Database created successfully'
        });
    } catch (error) {
        console.error('Error creating database:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: error.body || error
        });
    }
});

// Add tasks to the database
router.post('/add-tasks', async (req, res) => {
    const { databaseId, tasks } = req.body;

    if (!databaseId || !tasks || !Array.isArray(tasks)) {
        return res.status(400).json({ 
            success: false, 
            error: 'Database ID and tasks array are required' 
        });
    }

    try {
        const results = [];
        const users = (await notion.users.list()).results;

        for (const task of tasks) {
            // Validate required fields
            if (!task.title) {
                throw new Error('Task title is required');
            }

            // Find assignee IDs if provided
            let assigneeIds = [];
            if (task.assignee) {
                assigneeIds = task.assignee.map(name => {
                    const user = users.find(u => u.name === name);
                    if (!user) throw new Error(`User ${name} not found`);
                    return user.id;
                });
            }

            // Create the page in Notion
            const newPage = await notion.pages.create({
                parent: {
                    database_id: databaseId
                },
                properties: {
                    Task: {
                        title: [{
                            text: {
                                content: task.title
                            }
                        }]
                    },
                    ...(task.status && {
                        Status: {
                            select: {
                                name: task.status
                            }
                        }
                    }),
                    ...(assigneeIds.length > 0 && {
                        Assignee: {
                            people: assigneeIds.map(id => ({
                                id: id
                            }))
                        }
                    }),
                    ...(task.dueDate && {
                        Due: {
                            date: {
                                start: task.dueDate
                            }
                        }
                    }),
                    ...(task.project && {
                        Project: {
                            select: {
                                name: task.project
                            }
                        }
                    })
                }
            });

            results.push(newPage);
        }

        res.json({ 
            success: true, 
            tasks: results,
            message: `Successfully added ${results.length} tasks`
        });
    } catch (error) {
        console.error('Error adding tasks:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: error.body || error
        });
    }
});

// Get all users from Notion
router.get('/get-users', async (req, res) => {
    try {
        const response = await notion.users.list();
        res.json({
            success: true,
            users: response.results
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.body || error
        });
    }
});

// Get all tasks from the database
router.get('/tasks', async (req, res) => {
    try {
      const databaseId = "19446fcb-6003-8170-974f-ee59405cd704"; // Your database ID from the URL
      
      const response = await notion.databases.query({
        database_id: databaseId,
        sorts: [
          {
            property: 'Due',
            direction: 'ascending',
          },
        ],
    });
    
    const tasks = response.results.map(page => ({
      id: page.id,
      title: page.properties.Task.title[0]?.plain_text || '',
      assignee: {
        name: page.properties.Assignee.people[0]?.name || '',
        initial: page.properties.Assignee.people[0]?.name?.[0] || '',
      },
      dueDate: page.properties.Due.date?.start || null,
      project: {
        name: page.properties.Project.select?.name || '',
      },
      status: page.properties.Status.select.name || 'Not started'
    }));
  
      res.json({
        success: true,
        count: tasks.length,
        data: tasks
      });
  
    } catch (error) {
      console.error('Error fetching from Notion:', error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch tasks from Notion",
        details: error.message
      });
    }
});

// Endpoint to fetch today's blocks
router.get('/notion/today-items', async (req, res) => {
    try {
      // Set up time range for today (midnight to midnight)
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);
  
      // Search for all content types in the workspace
      const searchResponse = await notion.search({
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time'  // Fixed: using last_edited_time instead of created_time
        },
        page_size: 100
      });
  
      // Filter items created today and transform the data
      const todayItems = await Promise.all(
        searchResponse.results
          .filter(item => {
            const createdTime = new Date(item.created_time);
            return createdTime >= startOfDay && createdTime < endOfDay;
          })
          .map(async item => {
            let itemData = {
              id: item.id,
              type: item.object,
              created_time: item.created_time,
              last_edited_time: item.last_edited_time,
              url: item.url
            };
  
            // Add title/name based on item type
            if (item.object === 'page') {
              itemData.title = item.properties?.title?.title?.[0]?.plain_text 
                || item.properties?.Name?.title?.[0]?.plain_text 
                || 'Untitled';
              
              // Fetch blocks for pages
              const blocks = await notion.blocks.children.list({
                block_id: item.id,
              });
              itemData.blocks = blocks.results;
            } 
            else if (item.object === 'database') {
              itemData.title = item.title?.[0]?.plain_text || 'Untitled Database';
            }
            else if (item.object === 'block') {
              itemData.type = item.type;
              itemData.content = item[item.type];
            }
  
            return itemData;
          })
      );
  
      // Group items by type for better organization
      const groupedItems = todayItems.reduce((acc, item) => {
        const type = item.type;
        if (!acc[type]) acc[type] = [];
        acc[type].push(item);
        return acc;
      }, {});
  
      res.json({
        success: true,
        data: {
          date: startOfDay.toISOString().split('T')[0],
          total: todayItems.length,
          items: groupedItems
        }
      });
  
    } catch (error) {
      console.error('Error fetching Notion items:', error);
      const errorMessage = error.body?.message || error.message || 'Unknown error occurred';
      
      res.status(error.status || 500).json({
        success: false,
        error: errorMessage,
        code: error.code || 'UNKNOWN_ERROR'
      });
    }
});

// Endpoint to generate a daily report
router.get('/generate-report', async (req, res) => {
    try {
      // Fetch tasks from the local API
      const tasksResponse = await axios.get('http://localhost:3000/api/tasks');
      const tasks = tasksResponse.data;
  
      // Prepare the context for OpenAI
      const context = JSON.stringify(tasks, null, 2);
  
      // Construct the prompt
      const prompt = `Based on the following tasks data:
  ${context}
  
  Generate a structured, paragraph-wise daily report in a Notion-friendly format. The report should:
  1. Start with a high-level summary of key updates
  2. Categorize tasks by project
  3. Highlight progress made today
  4. Outline next steps and priorities
  5. Use Notion-compatible markdown formatting
  
  Format the report with clear headings, bullet points where appropriate, and ensure it's well-structured and easy to read in markdown language which is recognised by react-markdown.`;
  
      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a professional project manager who writes clear, concise, and well-structured daily reports."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });
  
      // Transform the response if needed
      const report = completion.choices[0].message.content;
  
      // Structure the final response
      res.json({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          report: report,
          metadata: {
            tasksAnalyzed: tasks.length,
            reportLength: report.length,
            generatedBy: 'OpenAI GPT-4',
          }
        }
      });
  
    } catch (error) {
      console.error('Error generating report:', error);
      
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error occurred';
      const statusCode = error.response?.status || 500;
      
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        code: error.code || 'REPORT_GENERATION_ERROR'
      });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});