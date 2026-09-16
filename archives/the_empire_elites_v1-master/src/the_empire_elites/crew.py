import os

from crewai import LLM
from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task
from crewai_tools import (
	FileReadTool,
	ScrapeWebsiteTool,
	JinaScrapeWebsiteTool,
	ArxivPaperTool
)






@CrewBase
class TheEmpireElitesCrew:
    """TheEmpireElites crew"""

    
    @agent
    def software_architect(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["software_architect"],
            
            
            tools=[				FileReadTool()],
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            apps=[
                    "github/get_file",
                    ],
            
            
            max_execution_time=None,
            llm=LLM(
                model="groq/llama-3.1-8b-instant",
            
                
                
            ),
            
        )
        
    
    @agent
    def senior_developer(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["senior_developer"],
            
            
            tools=[				FileReadTool(),
				ScrapeWebsiteTool()],
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            apps=[
                    "github/get_file",
                    
                    "github/get_pull_request_by_number",
                    
                    "github/get_files_changed_in_pr",
                    ],
            
            
            max_execution_time=None,
            llm=LLM(
                model="groq/llama-3.1-8b-instant",
            
                
                
            ),
            
        )
        
    
    @agent
    def qa_engineer(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["qa_engineer"],
            
            
            tools=[				FileReadTool()],
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            apps=[
                    "github/create_issue",
                    
                    "github/update_issue",
                    
                    "github/search_issue",
                    ],
            
            
            max_execution_time=None,
            llm=LLM(
                model="groq/llama-3.1-8b-instant",
            
                
                
            ),
            
        )
        
    
    @agent
    def devops_engineer(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["devops_engineer"],
            
            
            tools=[				FileReadTool(),
				ScrapeWebsiteTool()],
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            apps=[
                    "github/create_release",
                    
                    "github/update_release",
                    
                    "github/get_release_by_tag_name",
                    
                    "github/get_file",
                    ],
            
            
            max_execution_time=None,
            llm=LLM(
                model="groq/llama-3.1-8b-instant",
            
                
                
            ),
            
        )
        
    
    @agent
    def project_manager(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["project_manager"],
            
            
            tools=[				FileReadTool()],
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            apps=[
                    "github/search_issue",
                    
                    "github/get_issue_by_number",
                    
                    "github/create_release",
                    
                    "github/get_release_by_tag_name",
                    ],
            
            
            max_execution_time=None,
            llm=LLM(
                model="groq/llama-3.1-8b-instant",
            
                
                
            ),
            
        )
        
    
    @agent
    def development_quality_time_supervisor(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["development_quality_time_supervisor"],
            
            
            tools=[				FileReadTool()],
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            apps=[
                    "github/get_pull_request_by_number",
                    
                    "github/get_files_changed_in_pr",
                    
                    "github/search_issue",
                    
                    "github/get_file",
                    ],
            
            
            max_execution_time=None,
            llm=LLM(
                model="groq/llama-3.1-8b-instant",
            
                
                
            ),
            
        )
        
    
    @agent
    def integration_success_specialist(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["integration_success_specialist"],
            
            
            tools=[				JinaScrapeWebsiteTool()],
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            
            max_execution_time=None,
            llm=LLM(
                model="groq/llama-3.1-8b-instant",
            
                
                
            ),
            
        )
        
    
    @agent
    def chief_of_staff_personal_assistant(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["chief_of_staff_personal_assistant"],
            
            
            tools=[				FileReadTool(),
				ScrapeWebsiteTool()],
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            
            max_execution_time=None,
            llm=LLM(
                model="groq/llama-3.1-8b-instant",
            
                
                
            ),
            
        )
        
    
    @agent
    def sales_lead_generation_specialist(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["sales_lead_generation_specialist"],
            
            
            tools=[				ScrapeWebsiteTool(),
				JinaScrapeWebsiteTool(),
				FileReadTool()],
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            
            max_execution_time=None,
            llm=LLM(
                model="groq/llama-3.1-8b-instant",
            
                
                
            ),
            
        )
        
    
    @agent
    def marketing_brand_specialist(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["marketing_brand_specialist"],
            
            
            tools=[				ScrapeWebsiteTool(),
				JinaScrapeWebsiteTool(),
				FileReadTool(),
				ArxivPaperTool()],
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            
            max_execution_time=None,
            llm=LLM(
                model="groq/llama-3.1-8b-instant",
            
                
                
            ),
            
        )
        
    
    @agent
    def ux_ui_design_specialist(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["ux_ui_design_specialist"],
            
            
            tools=[				ScrapeWebsiteTool(),
				JinaScrapeWebsiteTool(),
				FileReadTool()],
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            
            max_execution_time=None,
            llm=LLM(
                model="groq/llama-3.1-8b-instant",
            
                
                
            ),
            
        )
        
    
    @agent
    def cybersecurity_compliance_specialist(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["cybersecurity_compliance_specialist"],
            
            
            tools=[				ScrapeWebsiteTool(),
				FileReadTool()],
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            
            max_execution_time=None,
            llm=LLM(
                model="groq/llama-3.1-8b-instant",
            
                
                
            ),
            
        )
        
    
    @agent
    def legal_intellectual_property_specialist(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["legal_intellectual_property_specialist"],
            
            
            tools=[				ScrapeWebsiteTool(),
				JinaScrapeWebsiteTool(),
				FileReadTool()],
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            
            max_execution_time=None,
            llm=LLM(
                model="groq/llama-3.1-8b-instant",
            
                
                
            ),
            
        )
        
    
    @agent
    def financial_strategy_investment_specialist(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["financial_strategy_investment_specialist"],
            
            
            tools=[				ScrapeWebsiteTool(),
				FileReadTool(),
				ArxivPaperTool()],
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            
            max_execution_time=None,
            llm=LLM(
                model="groq/llama-3.1-8b-instant",
            
                
                
            ),
            
        )
        
    
    @agent
    def global_expansion_localization_specialist(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["global_expansion_localization_specialist"],
            
            
            tools=[				ScrapeWebsiteTool(),
				JinaScrapeWebsiteTool(),
				FileReadTool()],
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            
            max_execution_time=None,
            llm=LLM(
                model="groq/llama-3.1-8b-instant",
            
                
                
            ),
            
        )
        
    
    @agent
    def hardware_optimization_specialist(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["hardware_optimization_specialist"],
            
            
            
            tools=[				FileReadTool(),
				ScrapeWebsiteTool()],
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            
            max_execution_time=None,
            llm=LLM(
                model="groq/llama-3.1-8b-instant",
            
                
                
            ),
            
        )
        
    
    @agent
    def requirements_analyst(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["requirements_analyst"],
            
            
            tools=[				FileReadTool()],
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            
            max_execution_time=None,
            llm=LLM(
                model="groq/llama-3.1-8b-instant",
            
                
                
            ),
            
        )
        
    

    
    @task
    def hardware_configuration_optimization(self) -> Task:
        return Task(
            config=self.tasks_config["hardware_configuration_optimization"],
            markdown=False,
            
            
        )
    
    @task
    def gather_and_analyze_project_requirements(self) -> Task:
        return Task(
            config=self.tasks_config["gather_and_analyze_project_requirements"],
            markdown=False,
            
            
        )
    
    @task
    def monitor_development_team_quality_timeline(self) -> Task:
        return Task(
            config=self.tasks_config["monitor_development_team_quality_timeline"],
            markdown=False,
            
            
        )
    
    @task
    def design_system_architecture(self) -> Task:
        return Task(
            config=self.tasks_config["design_system_architecture"],
            markdown=False,
            
            
        )
    
    @task
    def implement_core_application_features(self) -> Task:
        return Task(
            config=self.tasks_config["implement_core_application_features"],
            markdown=False,
            
            
        )
    
    @task
    def integration_connectivity_validation(self) -> Task:
        return Task(
            config=self.tasks_config["integration_connectivity_validation"],
            markdown=False,
            
            
        )
    
    @task
    def user_experience_design_interface_creation(self) -> Task:
        return Task(
            config=self.tasks_config["user_experience_design_interface_creation"],
            markdown=False,
            
            
        )
    
    @task
    def execute_comprehensive_testing_strategy(self) -> Task:
        return Task(
            config=self.tasks_config["execute_comprehensive_testing_strategy"],
            markdown=False,
            
            
        )
    
    @task
    def setup_production_deployment_pipeline(self) -> Task:
        return Task(
            config=self.tasks_config["setup_production_deployment_pipeline"],
            markdown=False,
            
            
        )
    
    @task
    def strategic_sales_lead_generation(self) -> Task:
        return Task(
            config=self.tasks_config["strategic_sales_lead_generation"],
            markdown=False,
            
            
        )
    
    @task
    def brand_building_marketing_campaign(self) -> Task:
        return Task(
            config=self.tasks_config["brand_building_marketing_campaign"],
            markdown=False,
            
            
        )
    
    @task
    def enterprise_security_compliance_framework(self) -> Task:
        return Task(
            config=self.tasks_config["enterprise_security_compliance_framework"],
            markdown=False,
            
            
        )
    
    @task
    def financial_strategy_investment_planning(self) -> Task:
        return Task(
            config=self.tasks_config["financial_strategy_investment_planning"],
            markdown=False,
            
            
        )
    
    @task
    def legal_foundation_intellectual_property_protection(self) -> Task:
        return Task(
            config=self.tasks_config["legal_foundation_intellectual_property_protection"],
            markdown=False,
            
            
        )
    
    @task
    def global_market_expansion_localization_strategy(self) -> Task:
        return Task(
            config=self.tasks_config["global_market_expansion_localization_strategy"],
            markdown=False,
            
            
        )
    
    @task
    def coordinate_project_delivery_stakeholder_communication(self) -> Task:
        return Task(
            config=self.tasks_config["coordinate_project_delivery_stakeholder_communication"],
            markdown=False,
            
            
        )
    
    @task
    def final_quality_timeline_assessment(self) -> Task:
        return Task(
            config=self.tasks_config["final_quality_timeline_assessment"],
            markdown=False,
            
            
        )
    
    @task
    def excellence_validation_user_experience_optimization(self) -> Task:
        return Task(
            config=self.tasks_config["excellence_validation_user_experience_optimization"],
            markdown=False,
            
            
        )
    
    @task
    def daily_progress_next_steps_briefing(self) -> Task:
        return Task(
            config=self.tasks_config["daily_progress_next_steps_briefing"],
            markdown=False,
            
            
        )
    

    @crew
    def crew(self) -> Crew:
        """Creates the TheEmpireElites crew"""

        return Crew(
            agents=self.agents,  # Automatically created by the @agent decorator
            tasks=self.tasks,  # Automatically created by the @task decorator
            process=Process.sequential,
            verbose=True,

            chat_llm=LLM(model="groq/llama-3.1-8b-instant"),
        )


