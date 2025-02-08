import express from 'express';
import { Client } from '@notionhq/client';
import cookieParser from "cookie-parser"
import cors from "cors"

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});