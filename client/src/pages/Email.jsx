import { useEffect, useState } from "react"
import { format, set } from "date-fns"
import { Mail, ArrowLeft } from "lucide-react"
import axios from "axios"
import { Button } from "@/components/ui/button"

export default function Email() {
  const [emails, setEmails] = useState([])
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    const fetchEmails = async () => {
      try {
        const response = await axios.get("http://localhost:8000/sentiment/emails")
        console.log(response.data)
        setEmails(response.data)
      } catch (error) {
        console.log(error)
      }
    }

    fetchEmails()
  }, [])

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await axios.get("http://localhost:8000/tasks")
        setTasks(response.data)
      } catch (error) {
        console.log(error)
      }
    }

    fetchTasks()
  }, [])

  const showEmailDetails = (email) => {
    setSelectedEmail(email)
  }

  const goBack = () => {
    setSelectedEmail(null)
  }

    const handleClick = async () => {
        const response = await axios.post("http://localhost:3000/api/add-tasks", {
            databaseId: "19446fcb-6003-8170-974f-ee59405cd704",
            tasks: tasks
        })
        console.log(response.data)
        setTasks([])
    }

  return (
    <div className="w-[1280px] flex">
      {/* Email Section */} 
      <div className="h-screen w-1/3 bg-white shadow-lg rounded-lg overflow-hidden border-r">
        {!selectedEmail ? (
          <>
            <div className="bg-gray-100 px-4 py-3 border-b">
              <h2 className="text-lg font-semibold text-gray-800">Inbox</h2>
            </div>
            <div className="divide-y divide-gray-200 overflow-y-auto" style={{ maxHeight: "calc(100vh - 3rem)" }}>
              {emails.map((email) => (
                <div
                  key={email.msg_id}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => showEmailDetails(email)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <span className="font-medium text-gray-900">{email.subject}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {format(new Date(email.processed_at), "MMM d, yyyy")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 truncate">{email.body}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col">
            <div className="bg-gray-100 px-4 py-3 border-b flex items-center">
              <button
                onClick={goBack}
                className="mr-3 hover:bg-gray-200 p-1 rounded-full"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <h2 className="text-lg font-semibold text-gray-800">Email Details</h2>
            </div>
            <div className="p-6 overflow-y-auto flex-grow">
              <h3 className="text-xl font-semibold mb-4">{selectedEmail.subject}</h3>
              <p className="text-sm text-gray-600 mb-2">
                Processed: {format(new Date(selectedEmail.processed_at), "MMM d, yyyy HH:mm:ss")}
              </p>
              <p className="text-sm text-gray-600 mb-2">Priority: {selectedEmail.priority}</p>
              <p className="text-sm text-gray-600 mb-4">
                Sentiment: {selectedEmail.sentiment} (Confidence: {(selectedEmail.confidence * 100).toFixed(2)}%)
              </p>
              <div className="bg-gray-100 p-4 rounded">
                <p className="whitespace-pre-wrap">{selectedEmail.body}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tasks Section */}
      <div className="h-screen w-2/3 bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-4 py-3 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Tasks</h2>
          <Button onClick={handleClick} >Add to Notion</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tasks.map((task, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{task.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{task.project}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{task.assignee.join(", ")}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {task.dueDate}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}