import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import axios from "axios"
import MarkdownComponent from "@/components/MarkdownComponent"

const TeamMemberCard = ({ name, avatar, tasksCompleted, totalTasks }) => {
    const completionPercentage = (tasksCompleted / totalTasks) * 100

    return (
        <Card className="w-full">
            <CardContent className="flex items-center p-4 space-x-4">
                <Avatar>
                    <AvatarImage src={avatar} alt={name} />
                    <AvatarFallback>
                        {name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-grow space-y-2">
                    <h3 className="font-semibold">{name}</h3>
                    <div className="space-y-1">
                        <div className="flex justify-between text-sm text-gray-500">
                            <span>Tasks completed: {tasksCompleted}/{totalTasks}</span>
                            <span>{Math.round(completionPercentage)}%</span>
                        </div>
                        <Progress value={completionPercentage} className="h-2" />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default function Tasks() {
    const [tasks, setTasks] = useState([])
    const [generatedTasks, setGeneratedTasks] = useState([])
    const [teamMembers, setTeamMembers] = useState([])
    const [prompt, setPrompt] = useState('')
    
    // Loading states
    const [isTasksLoading, setIsTasksLoading] = useState(false)
    const [isGeneratingTasks, setIsGeneratingTasks] = useState(false)
    const [isConfirmingTasks, setIsConfirmingTasks] = useState(false)

    const fetchTasks = async () => {
        setIsTasksLoading(true)
        try {
            const response = await axios.get('http://localhost:3000/api/tasks');
            setTasks(response.data.data);
            console.log('Team members:', response.data.data);
        } catch (error) {
            console.error('Error fetching team members:', error);
        } finally {
            setIsTasksLoading(false)
        }
    }

    useEffect(() => {
        fetchTasks();
    }, [])

    useEffect(() => {
        fetchMembersAndTasks();
    }, [tasks])

    const fetchMembersAndTasks = () => {
        const membersMap = new Map();

        tasks.forEach(task => {
            console.log('Task:', task); 
            const member = task.assignee;
            if (!membersMap.has(member.name)) {
                membersMap.set(member.name, {
                    id: member.name,
                    name: member.name,
                    avatar: '',
                    tasksCompleted: 0,
                    totalTasks: 0
                });
            }
            const memberData = membersMap.get(member.name);
            memberData.totalTasks++;
            if (task.status === 'Completed') {
                memberData.tasksCompleted++;
            }
        });

        setTeamMembers(Array.from(membersMap.values()));
    }

    const addTasks = async () => {
        setIsGeneratingTasks(true)
        try {
            const response = await axios.post('http://127.0.0.1:5000/generate-tasks', {
                prompt: prompt
            });
            console.log('Generated tasks:', response.data.tasks);
            setGeneratedTasks(response.data.tasks);
            setPrompt(''); // Clear prompt after successful generation
        } catch (error) {
            console.error('Error generating tasks:', error);
        } finally {
            setIsGeneratingTasks(false)
        }
    }

    const handleConfirmTasks = async () => {
        setIsConfirmingTasks(true)
        try {
            const response = await axios.post('http://localhost:3000/api/add-tasks', {
                databaseId: "19446fcb-6003-8170-974f-ee59405cd704",
                tasks: generatedTasks
            });
            await fetchTasks();
            setGeneratedTasks([]);
        } catch (error) {
            console.error('Error confirming tasks:', error);
        } finally {
            setIsConfirmingTasks(false)
        }
    }

    return (
        <div className="container mx-auto p-4 space-y-8">
            <h1 className="text-3xl font-bold">Your Team</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamMembers.map((member) => (
                    <TeamMemberCard key={member.id} {...member} />
                ))}
            </div>

            <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Create Task</h2>
                <Textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter task description..." 
                    className="w-full" 
                    disabled={isGeneratingTasks}
                />
                <Button 
                    className="w-full"
                    onClick={addTasks}
                    disabled={isGeneratingTasks || !prompt.trim()}
                >
                    {isGeneratingTasks && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isGeneratingTasks ? 'Generating Tasks...' : 'Create Task'}
                </Button>
            </div>

            {generatedTasks && generatedTasks.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-2xl font-semibold">Generated Tasks</h2>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Project</TableHead>
                                    <TableHead>Assignee</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {generatedTasks.map((task, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">{task.title}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {task.project}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{task.assignee.join(', ')}</TableCell>
                                        <TableCell>{new Date(task.dueDate).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {task.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    
                    <div className="flex justify-end space-x-4">
                        <Button
                            variant="destructive"
                            onClick={() => setGeneratedTasks([])}
                            disabled={isConfirmingTasks}
                        >
                            Discard Assignments
                        </Button>
                        <Button
                            onClick={handleConfirmTasks}
                            disabled={isConfirmingTasks}
                        >
                            {isConfirmingTasks && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {isConfirmingTasks ? 'Scheduling...' : 'Confirm & Schedule Tasks'}
                        </Button>
                    </div>
                </div>
            )}
            <MarkdownComponent />
        </div>
    )
}